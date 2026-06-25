import sys
import csv
import time
import logging
import argparse
import traceback
from pathlib import Path
from typing import Dict, List, Optional, Any

# CWE-611 Mitigation: Require defusedxml to prevent XML External Entity (XXE) attacks.
try:
    import defusedxml.ElementTree as ET
except ImportError:
    print("FATAL ERROR: The 'defusedxml' package is required for secure XML parsing.")
    print("Please install it using: pip install defusedxml")
    sys.exit(1)

# Enforce strict UTC Time generation for all logging events
logging.Formatter.converter = time.gmtime

def configure_logging() -> logging.Logger:
    """Configures the root logger with ISO-8601 formatting."""
    logger = logging.getLogger('OntologyProcessor')
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%dT%H:%M:%SZ'
        )
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
    return logger

logger = configure_logging()

class OntologyConfiguration:
    """Immutable static mapping for ontology namespaces and target structures."""
    
    NAMESPACES: Dict[str, str] = {
        'iso': 'http://standards.iso.org/iso-iec/11179/-3/ed-4/',
        'rd': 'https://haddenindustries.com/ontology/universal/reference-data/',
        'owl': 'http://www.w3.org/2002/07/owl#',
        'dc': 'http://purl.org/dc/elements/1.1/',
        'dcterms': 'http://purl.org/dc/terms/',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'xml': 'http://www.w3.org/XML/1998/namespace',
        'skos': 'http://www.w3.org/2004/02/skos/core#'
    }

    RECORD_TAGS: List[str] = [
        '{http://www.w3.org/2002/07/owl#}Class',
        '{http://www.w3.org/2002/07/owl#}NamedIndividual'
    ]

    RDF_ABOUT = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about'
    RDF_RESOURCE = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource'
    RDF_TYPE = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}type'
    XML_LANG = '{http://www.w3.org/XML/1998/namespace}lang'
    UUID_PREFIX = 'urn:uuid:'

    # Axiom mapping targets
    OWL_AXIOM = '{http://www.w3.org/2002/07/owl#}Axiom'
    OWL_ANNOTATED_SOURCE = '{http://www.w3.org/2002/07/owl#}annotatedSource'
    OWL_ANNOTATED_PROPERTY = '{http://www.w3.org/2002/07/owl#}annotatedProperty'
    DCTERMS_SOURCE = '{http://purl.org/dc/terms/}source'
    SKOS_DEFINITION_URI = 'http://www.w3.org/2004/02/skos/core#definition'

    # Filter constraints - Implemented as Set for O(1) lookup
    EXCLUDED_DCAT_TYPES = {
        'http://www.w3.org/ns/dcat#Dataset',
        'http://www.w3.org/ns/dcat#Distribution'
    }

    # I/O Specifications
    TSV_DELIMITER = '\t'
    # Enforces UNIX (LF) terminators. Relies strictly on `newline=''` being 
    # passed to the Python open() handler to prevent Windows CRLF coercion.
    TSV_TERMINATOR = '\n' 

    FIELDS: List[Dict[str, str]] = [
        {'header_name': 'Object Type'},
        {'header_name': 'UUID', 'tag': '{http://purl.org/dc/terms/}identifier'},
        {'header_name': 'URI'},
        {'header_name': 'Preferred Label', 'tag': '{http://www.w3.org/2004/02/skos/core#}prefLabel'},
        {'header_name': 'Definition', 'tag': '{http://www.w3.org/2004/02/skos/core#}definition'},
        {'header_name': 'Sources', 'tag': '{http://purl.org/dc/terms/}source'},
        {'header_name': 'Creator', 'tag': '{http://purl.org/dc/terms/}creator'},
        {'header_name': 'CreatedAt', 'tag': '{http://purl.org/dc/terms/}created'},
        {'header_name': 'ModifiedAt', 'tag': '{http://purl.org/dc/terms/}modified'},
        {'header_name': 'SubClassOf', 'tag': '{http://www.w3.org/2000/01/rdf-schema#}subClassOf'},
        {'header_name': 'Class of Named Individual', 'tag': '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}type'}
    ]

class SecuritySanitizer:
    """Encapsulates string sterilization logic prior to I/O egress."""
    
    @staticmethod
    def sanitize_tsv_injection(payload: str) -> str:
        """
        CWE-1236 Mitigation.
        Neutralizes macro-execution trigger characters in spreadsheet parsers.
        """
        if not payload:
            return ""
        
        sanitized = payload.strip()
        if sanitized.startswith(('=', '+', '-', '@')):
            return f"'{sanitized}"
            
        return sanitized

class OntologyExtractor:
    """Strategy class executing targeted extractions against individual DOM elements."""

    @staticmethod
    def extract_local_name(tag: str) -> str:
        """Strips namespace URI from an element tag."""
        if '}' in tag:
            return tag.split('}', 1)[1]
        return tag

    @staticmethod
    def extract_preferred_language(element: Any, target_tag: str, preferred: str = 'en-GB', fallback: str = 'en') -> str:
        """Locates the text of a tag, preferring explicit language definitions."""
        best_match = ""
        preferred_match = None
        fallback_match = None
        first_match = None

        for child in element.iterfind(target_tag, OntologyConfiguration.NAMESPACES):
            lang = child.get(OntologyConfiguration.XML_LANG)
            text_val = child.text.strip() if child.text else ""

            if first_match is None:
                first_match = text_val

            if lang == preferred:
                preferred_match = text_val
                break 
            elif lang == fallback:
                fallback_match = text_val

        if preferred_match is not None:
            best_match = preferred_match
        elif fallback_match is not None:
            best_match = fallback_match
        elif first_match is not None:
            best_match = first_match

        return best_match

    @staticmethod
    def extract_resource_attribute(element: Any, target_tag: str) -> str:
        """Retrieves the rdf:resource attribute from a targeted child tag."""
        child = element.find(target_tag, OntologyConfiguration.NAMESPACES)
        if child is not None:
            resource = child.get(OntologyConfiguration.RDF_RESOURCE)
            if resource:
                return resource.strip()
        return ""

class OntologyProcessor:
    """Coordinates parsing, Axiom indexing, iteration, and egress stream writing."""

    def __init__(self, input_paths: List[Path], output_path: Path):
        self.input_paths = input_paths
        self.output_path = output_path
        self.total_records = 0
        self.failed_files = 0
        self.processed_files = 0

    def _build_axiom_index(self, root: Any) -> Dict[str, str]:
        """
        Executes an O(N) pre-processing pass mapping URI sources to multiple Axiom resources.
        Outputs a Dictionary linking the AnnotatedSource to a \n separated string of sources.
        """
        axiom_map: Dict[str, str] = {}
        
        for axiom in root.iterfind(OntologyConfiguration.OWL_AXIOM, OntologyConfiguration.NAMESPACES):
            annotated_source = axiom.find(OntologyConfiguration.OWL_ANNOTATED_SOURCE, OntologyConfiguration.NAMESPACES)
            annotated_property = axiom.find(OntologyConfiguration.OWL_ANNOTATED_PROPERTY, OntologyConfiguration.NAMESPACES)
            
            if annotated_source is not None and annotated_property is not None:
                source_uri = annotated_source.get(OntologyConfiguration.RDF_RESOURCE)
                property_uri = annotated_property.get(OntologyConfiguration.RDF_RESOURCE)
                
                if property_uri == OntologyConfiguration.SKOS_DEFINITION_URI and source_uri:
                    source_resources = []
                    for dcterms_src in axiom.iterfind(OntologyConfiguration.DCTERMS_SOURCE, OntologyConfiguration.NAMESPACES):
                        res_val = dcterms_src.get(OntologyConfiguration.RDF_RESOURCE)
                        if res_val:
                            source_resources.append(res_val.strip())
                            
                    if source_resources:
                        concatenated_sources = OntologyConfiguration.TSV_TERMINATOR.join(source_resources)
                        if source_uri in axiom_map:
                            axiom_map[source_uri] += OntologyConfiguration.TSV_TERMINATOR + concatenated_sources
                        else:
                            axiom_map[source_uri] = concatenated_sources
                            
        return axiom_map

    def _compile_record_vector(self, element: Any, object_type: str, record_uri: str, axiom_index: Dict[str, str]) -> List[str]:
        """Extracts and serializes all requested columns for a single DOM element."""
        row_vector = []
        
        for field in OntologyConfiguration.FIELDS:
            header = field['header_name']
            tag = field.get('tag')
            extracted_value = ""

            try:
                if header == 'Object Type':
                    extracted_value = object_type
                elif header == 'URI':
                    extracted_value = record_uri
                elif header == 'UUID' and tag:
                    for identifier in element.iterfind(tag, OntologyConfiguration.NAMESPACES):
                        res = identifier.get(OntologyConfiguration.RDF_RESOURCE)
                        if res and res.startswith(OntologyConfiguration.UUID_PREFIX):
                            extracted_value = res[len(OntologyConfiguration.UUID_PREFIX):]
                            break
                elif header in ('Preferred Label', 'Definition') and tag:
                    extracted_value = OntologyExtractor.extract_preferred_language(element, tag)
                elif header == 'Sources' and tag:
                    if record_uri.startswith('https://haddenindustries.com/ontology/iso'):
                        identifier_tag = '{http://purl.org/dc/terms/}identifier'
                        for identifier in element.iterfind(identifier_tag, OntologyConfiguration.NAMESPACES):
                            res = identifier.get(OntologyConfiguration.RDF_RESOURCE)
                            text_val = identifier.text.strip() if identifier.text else ""
                            if res and res.startswith('urn:iso'):
                                extracted_value = res
                                break
                            elif text_val.startswith('urn:iso'):
                                extracted_value = text_val
                                break
                                
                    # If extraction failed (or was skipped because entity wasn't ISO),
                    # fall back to standard source extraction via dcterms:source & Axiom index
                    if not extracted_value:
                        extracted_value = OntologyExtractor.extract_resource_attribute(element, tag)
                        if not extracted_value and record_uri in axiom_index:
                            extracted_value = axiom_index[record_uri]
                elif header in ('Creator', 'SubClassOf', 'Class of Named Individual') and tag:
                    extracted_value = OntologyExtractor.extract_resource_attribute(element, tag)
                else:
                    if tag:
                        child_node = element.find(tag, OntologyConfiguration.NAMESPACES)
                        if child_node is not None and child_node.text:
                            extracted_value = child_node.text.strip()
            except Exception as ex:
                logger.warning(f"Field extraction failure: '{header}' on URI '{record_uri}' - {str(ex)}")
                extracted_value = ""

            safe_value = SecuritySanitizer.sanitize_tsv_injection(extracted_value)
            row_vector.append(safe_value)
            
        return row_vector

    def _process_document(self, file_path: Path, tsv_writer: Any) -> None:
        """Loads a single XML document into DOM, filters targets, and emits TSV rows."""
        logger.info(f"Initiating DOM ingestion for: {file_path}")
        
        try:
            # CWE-22 Mitigation / CWE-611 Mitigation 
            resolved_path = str(file_path.resolve())
            tree = ET.parse(resolved_path)
            root = tree.getroot()
            
            # Pre-compute relationships map to ensure O(1) query later
            axiom_index = self._build_axiom_index(root)
            
            file_records = 0
            for element in root:
                if element.tag not in OntologyConfiguration.RECORD_TAGS:
                    continue
                    
                record_uri = element.get(OntologyConfiguration.RDF_ABOUT, '')
                if not record_uri.startswith('https://haddenindustries.com/'):
                    continue 

                local_tag_name = OntologyExtractor.extract_local_name(element.tag)
                object_type = 'Class' if local_tag_name == 'Class' else 'Named Individual' if local_tag_name == 'NamedIndividual' else local_tag_name
                
                if local_tag_name == 'NamedIndividual':
                    skip_entity = False
                    for type_node in element.iterfind(OntologyConfiguration.RDF_TYPE, OntologyConfiguration.NAMESPACES):
                        if type_node.get(OntologyConfiguration.RDF_RESOURCE) in OntologyConfiguration.EXCLUDED_DCAT_TYPES:
                            skip_entity = True
                            break
                    if skip_entity:
                        continue
                
                row_vector = self._compile_record_vector(element, object_type, record_uri, axiom_index)
                tsv_writer.writerow(row_vector)
                file_records += 1

            self.total_records += file_records
            self.processed_files += 1
            logger.info(f"Extraction successful: {file_records} records mapped.")
            
        except ET.ParseError as e:
            logger.error(f"Malformed XML payload detected at {file_path}. Details: {e}")
            self.failed_files += 1
        except Exception as e:
            logger.error(f"Critical execution failure on {file_path}: {e}")
            self.failed_files += 1

    def execute_pipeline(self) -> None:
        """Initializes the TSV stream and routes all documents through processing."""
        output_dir = self.output_path.parent
        if not output_dir.exists():
            output_dir.mkdir(parents=True, exist_ok=True)

        try:
            headers = [f['header_name'] for f in OntologyConfiguration.FIELDS]
            
            # `newline=''` is mandatory to prevent Windows CRLF injection on I/O.
            with open(self.output_path, 'w', newline='', encoding='utf-8') as tsvfile:
                writer = csv.writer(
                    tsvfile, 
                    delimiter=OntologyConfiguration.TSV_DELIMITER, 
                    lineterminator=OntologyConfiguration.TSV_TERMINATOR
                )
                writer.writerow(headers)
                
                for input_path in self.input_paths:
                    if not input_path.exists():
                        logger.warning(f"File unresolvable. Skipping target: {input_path}")
                        self.failed_files += 1
                        continue
                        
                    self._process_document(input_path, writer)
                    
            logger.info("=== Pipeline Execution Finalized ===")
            logger.info(f"Aggregated Records Emitted: {self.total_records}")
            logger.info(f"Completed Documents: {self.processed_files}")
            if self.failed_files > 0:
                logger.warning(f"Failed/Skipped Documents: {self.failed_files}")
                
        except Exception as e:
            logger.error(f"Failed to initialize TSV file stream: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Secure XML Ontology to TSV Transformer.")
    parser.add_argument('input_file_paths', type=Path, nargs='+', help="One or more target XML files.")
    parser.add_argument('output_file_path', type=Path, help="Absolute or relative path to the destination TSV.")
    
    args = parser.parse_args()
    
    try:
        processor = OntologyProcessor(args.input_file_paths, args.output_file_path)
        processor.execute_pipeline()
    except Exception as general_ex:
        logger.critical(f"System halt. Unhandled bootstrap exception: {general_ex}")
        sys.exit(1)
