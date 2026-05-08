import xml.etree.ElementTree as ET
import csv
import os # Used for path joining
import argparse # For command-line arguments
from pathlib import Path # For handling file paths object-oriented way
import traceback # For detailed error printing

# --- User Configuration ---

# --- File Paths ---
# Input XML file paths - Now expected via command-line argument (one or more)
# Output CSV file path - Now expected via command-line argument (single path)

# --- XML Namespace Configuration ---
# Define the namespaces used in your XML file.
namespaces = {
    'iso': 'http://standards.iso.org/iso-iec/11179/-3/ed-4/',
    'rd': 'https://haddenindustries.com/ontology/universal/reference-data/',
    'owl': 'http://www.w3.org/2002/07/owl#',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'dcterms': 'http://purl.org/dc/terms/',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#', # Added RDFS namespace
    'xml': 'http://www.w3.org/XML/1998/namespace' # Added XML namespace for xml:lang
    # Add more namespaces if needed
}

# --- Data Structure Configuration ---
# Specify the XML element tags that represent a single record (row in CSV).
# This is now a list of tags.
record_element_tags = [
    '{http://www.w3.org/2002/07/owl#}Class',
    '{http://www.w3.org/2002/07/owl#}NamedIndividual'
]

# --- Field Extraction Configuration ---
# Specify the fields you want to extract within each record.
# The first field is now 'Object Type', determined programmatically.
fields_to_extract = [
    {
        'header_name': 'Object Type',
        # 'tag' is not needed here, value is determined by the record element tag
    },
    {
        'header_name': 'UUID',
        'tag': '{http://purl.org/dc/terms/}identifier'
    },
    {
        'header_name': 'URI',
        # 'tag' is not needed here, value is derived from the record element's attribute
    },
    {
        'header_name': 'Label',
        'tag': '{http://www.w3.org/2000/01/rdf-schema#}label'
    },
    {
        'header_name': 'Title',
        'tag': '{http://purl.org/dc/terms/}title'
    },
    {
        'header_name': 'Description',
        'tag': '{http://purl.org/dc/terms/}description'
    },
    {
        'header_name': 'References',
        'tag': '{http://purl.org/dc/terms/}references'
    },
    {
        'header_name': 'Creator',
        'tag': '{http://purl.org/dc/elements/1.1/}creator'
    },
    {
        'header_name': 'CreatedAt',
        'tag': '{http://purl.org/dc/terms/}created'
    },
    {
        'header_name': 'ModifiedAt',
        'tag': '{http://purl.org/dc/terms/}modified'
    },
    {
        'header_name': 'SubClassOf', # Applicable to Class
        'tag': '{http://www.w3.org/2000/01/rdf-schema#}subClassOf'
    },
    {
        'header_name': 'Type', # Applicable to NamedIndividual
        'tag': '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}type'
    }
    # Add other fields relevant to NamedIndividual if needed
]

# --- CSV Configuration ---
# Delimiter character to separate fields/columns in the CSV file.
csv_delimiter = '\u0009' # Horizontal Tab

# Line terminator character(s) to separate records/rows in the CSV file.
csv_lineterminator = '\n' # Newline

# --- End of User Configuration ---

def extract_local_name(tag):
    """Helper function to get the tag name without the namespace URI."""
    if '}' in tag:
        return tag.split('}', 1)[1]
    return tag # Return original tag if no namespace URI found

def get_preferred_lang_text(element, tag, preferred_lang='en-GB', fallback_lang='en'):
    """
    Finds text within child elements specified by 'tag', prioritizing by xml:lang.

    Args:
        element (ET.Element): The parent element to search within.
        tag (str): The tag name of the child elements to search for.
        preferred_lang (str): The preferred language code (e.g., 'en-GB').
        fallback_lang (str): The fallback language code (e.g., 'en').

    Returns:
        str: The text content of the preferred language element, fallback,
             the first element found, or an empty string if none found or text is None.
    """
    value = ''
    preferred_value = None
    fallback_value = None
    first_value = None
    xml_lang_attr = '{http://www.w3.org/XML/1998/namespace}lang' # Fully qualified attr name

    for child in element.iterfind(tag, namespaces): # Use iterfind for efficiency
        lang = child.get(xml_lang_attr)
        text = child.text.strip() if child.text else ''

        if first_value is None: # Store the first value found regardless of lang
             first_value = text

        if lang == preferred_lang:
            preferred_value = text
            break # Found the best match, no need to continue
        elif lang == fallback_lang:
            fallback_value = text

    # Determine the final value based on priority
    if preferred_value is not None:
        value = preferred_value
    elif fallback_value is not None:
        value = fallback_value
    elif first_value is not None:
        value = first_value
    # If none of the above, value remains ''

    return value


def parse_xml_to_csv(xml_path, csv_writer, ns, record_tags, field_definitions):
    """
    Parses a single XML file, finds elements matching any of the record_tags,
    and writes extracted records to the provided CSV writer.

    Args:
        xml_path (Path): Path object for the input XML file.
        csv_writer (csv.writer): An initialized csv.writer object.
        ns (dict): Dictionary of namespace prefixes and URIs.
        record_tags (list): List of fully qualified tag names ({URI}ElementName) for record elements.
        field_definitions (list): List of dictionaries defining fields to extract.

    Returns:
        int: The number of records successfully processed from this file.
             Returns -1 if parsing fails.
    """
    print(f"--- Processing XML file: {xml_path} ---")
    processed_count = 0
    try:
        # Parse the XML file
        tree = ET.parse(xml_path)
        root = tree.getroot()

        rdf_about_attr = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about'
        rdf_resource_attr = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource'
        uuid_prefix = 'urn:uuid:'

        # Iterate through all direct children of the root element
        for record_element in root:
            # Check if the element's tag is one of the specified record tags
            if record_element.tag not in record_tags:
                continue # Skip elements that are not target records

            # --- Record Filtering (Optional - Applied to both types) ---
            record_uri = record_element.get(rdf_about_attr, '') # Get URI safely
            # Example Filter: Skip if not a Hadden Industries record (adjust as needed)
            if not record_uri.startswith('https://haddenindustries.com/'):
                continue # Skip to the next record_element

            # --- Determine Object Type ---
            record_local_tag = extract_local_name(record_element.tag)
            object_type_value = ''
            if record_local_tag == 'Class':
                object_type_value = 'Class'
            elif record_local_tag == 'NamedIndividual':
                object_type_value = 'Named Individual'
            else:
                object_type_value = record_local_tag # Fallback if tag added later

            # --- Field Extraction ---
            row_data = []
            for field_def in field_definitions:
                field_header_name = field_def['header_name']
                # Get tag from definition, might be missing for special fields
                field_tag = field_def.get('tag')
                value = '' # Default value if not found

                try:
                    # --- Custom Logic per Header ---
                    if field_header_name == 'Object Type':
                        value = object_type_value # Use determined type
                    elif field_header_name == 'UUID':
                        # Find the first identifier with a urn:uuid resource
                        if field_tag: # Ensure tag is defined
                            for identifier in record_element.iterfind(field_tag, namespaces):
                                identifierRdfResource = identifier.get(rdf_resource_attr)
                                if identifierRdfResource and identifierRdfResource.startswith(uuid_prefix):
                                    value = identifierRdfResource[len(uuid_prefix):]
                                    break # Found the UUID, stop searching identifiers
                    elif field_header_name == 'URI':
                        # Get the 'about' attribute directly from the record element
                        value = record_uri # Use the already fetched URI
                    elif field_header_name in ('Label', 'Title', 'Description'):
                         # Use helper function for language preference
                         if field_tag: # Ensure tag is defined
                             value = get_preferred_lang_text(record_element, field_tag)
                    elif field_header_name in ('References', 'Creator', 'SubClassOf', 'Type'):
                        # Find the element and get its rdf:resource attribute
                        if field_tag: # Ensure tag is defined
                            field_element = record_element.find(field_tag, namespaces)
                            if field_element is not None:
                                resource_value = field_element.get(rdf_resource_attr)
                                if resource_value is not None:
                                    value = resource_value.strip()
                    else: # Default: Find element and get its text content
                        if field_tag: # Ensure tag is defined
                            field_element = record_element.find(field_tag, namespaces)
                            if field_element is not None and field_element.text is not None:
                                value = field_element.text.strip()

                except Exception as field_ex:
                    print(f"  Warning: Error processing field '{field_header_name}' for record URI '{record_uri}' (Type: {object_type_value}): {field_ex}")
                    value = '' # Ensure value is reset on error

                row_data.append(value) # Append extracted value or empty string

            # Write the extracted data as a row using the provided writer
            csv_writer.writerow(row_data)
            processed_count += 1

        print(f"  Successfully processed {processed_count} records from this file.")
        return processed_count

    except ET.ParseError as e:
        print(f"  Error: Failed to parse XML file {xml_path}. Details: {e}")
        return -1 # Indicate failure
    except Exception as e:
        print(f"  An unexpected error occurred while processing {xml_path}: {e}")
        traceback.print_exc()
        return -1 # Indicate failure


# --- Main Execution ---
if __name__ == "__main__":

    argumentParser = argparse.ArgumentParser(description="Extract data from XML files (handling Class and NamedIndividual) with namespaces to a single CSV.")
    # First positional argument: Input XML file paths (one or more)
    argumentParser.add_argument('input_file_paths', type=Path, nargs='+', help="Path(s) to the input XML file(s).")
    # Second positional argument: Output CSV file path (single)
    argumentParser.add_argument('output_file_path', type=str, help="Path for the single output CSV file.")

    parsedArguments = argumentParser.parse_args()

    # Assign parsed arguments to variables
    xml_file_paths = parsedArguments.input_file_paths # This is now a list of Path objects
    csv_file_path = parsedArguments.output_file_path

    # --- Basic Validation ---
    if not csv_file_path:
         print(f"!!! ERROR: The output CSV file path was not provided correctly. !!!")
         exit(1) # Exit if no output path
    if not record_element_tags or not fields_to_extract: # Check the list of tags
         print(f"!!! ERROR: 'record_element_tags' or 'fields_to_extract' configuration is empty. !!!")
         exit(1) # Exit if config is bad

    # Register namespaces globally once
    for prefix, uri in namespaces.items():
        ET.register_namespace(prefix, uri)

    # Prepare CSV header row from field definitions
    header = [field_def.get('header_name', 'Unnamed Column') for field_def in fields_to_extract]

    total_records_processed = 0
    files_processed_count = 0
    files_failed_count = 0

    try:
        # Ensure output directory exists
        output_dir = Path(csv_file_path).parent
        if output_dir and not output_dir.exists():
             print(f"Creating output directory: {output_dir}")
             output_dir.mkdir(parents=True, exist_ok=True)

        # Open the single CSV file for writing
        with open(csv_file_path, 'w', newline='', encoding='utf-8') as csvfile:
            # Create a CSV writer object
            writer = csv.writer(csvfile, delimiter=csv_delimiter, lineterminator=csv_lineterminator)

            # Write the header row ONCE
            writer.writerow(header)
            print(f"CSV Header written to {csv_file_path}: {header}")

            # --- Loop through Input Files ---
            for current_xml_path in xml_file_paths:
                # Validate individual input file path
                if not current_xml_path.exists():
                    print(f"!!! WARNING: Input XML file '{current_xml_path}' does not exist. Skipping. !!!")
                    files_failed_count += 1
                    continue # Skip to the next file

                # Run the parsing and writing function for the current file
                records_from_file = parse_xml_to_csv(
                    current_xml_path,
                    writer, # Pass the writer object
                    namespaces,
                    record_element_tags, # Pass the list of tags
                    fields_to_extract
                )

                if records_from_file >= 0:
                    total_records_processed += records_from_file
                    files_processed_count += 1
                else:
                    files_failed_count += 1

            # --- Processing Summary ---
            print("\n--- Processing Complete ---")
            print(f"Successfully processed {files_processed_count} file(s).")
            if files_failed_count > 0:
                 print(f"Failed to process or skipped {files_failed_count} file(s).")
            print(f"Total records written to {csv_file_path}: {total_records_processed}")

    except IOError as e:
        print(f"!!! ERROR: Could not write to output CSV file {csv_file_path}. Details: {e} !!!")
    except KeyError as e:
        print(f"!!! ERROR: Missing required key in field definition: {e}. Check 'fields_to_extract'. !!!")
    except Exception as e:
        print(f"!!! An unexpected error occurred during main execution: {e} !!!")
        traceback.print_exc()

