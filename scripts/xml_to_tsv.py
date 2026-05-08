import csv
import logging
import sys
import argparse
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    import defusedxml.ElementTree as SecureET
except ImportError:
    print("CRITICAL SECURITY FAILURE: 'defusedxml' module is required to mitigate CWE-611 (XXE).")
    print("Execute: pip install defusedxml")
    sys.exit(1)

class OntologyConfiguration:
    NAMESPACES: Dict[str, str] = {
        'iso': 'http://standards.iso.org/iso-iec/11179/-3/ed-4/',
        'rd': 'https://haddenindustries.com/ontology/universal/reference-data/',
        'owl': 'http://www.w3.org/2002/07/owl#',
        'dc': 'http://purl.org/dc/elements/1.1/',
        'dcterms': 'http://purl.org/dc/terms/',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'xml': 'http://www.w3.org/XML/1998/namespace'
    }

    TARGET_RECORDS: List[str] = [
        '{http://www.w3.org/2002/07/owl#}Class',
        '{http://www.w3.org/2002/07/owl#}NamedIndividual'
    ]

    RDF_ABOUT = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about'
    RDF_RESOURCE = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource'
    XML_LANG = '{http://www.w3.org/XML/1998/namespace}lang'
    UUID_URN_PREFIX = 'urn:uuid:'

    TSV_DELIMITER = '\t'
    # Enforces UNIX (LF) terminators. Relies strictly on `newline=''` being 
    # passed to `open()` in the processor to prevent Windows OS CRLF translation.
    TSV_TERMINATOR = '\n'
    DOMAIN_IDENTIFIER = 'https://haddenindustries.com/'

    FIELDS: List[Dict[str, Optional[str]]] = [
        {'header': 'Object Type', 'tag': None},
        {'header': 'UUID', 'tag': '{http://purl.org/dc/terms/}identifier'},
        {'header': 'URI', 'tag': None},
        {'header': 'Label', 'tag': '{http://www.w3.org/2000/01/rdf-schema#}label'},
        {'header': 'Title', 'tag': '{http://purl.org/dc/terms/}title'},
        {'header': 'Description', 'tag': '{http://purl.org/dc/terms/}description'},
        {'header': 'References', 'tag': '{http://purl.org/dc/terms/}references'},
        {'header': 'Creator', 'tag': '{http://purl.org/dc/elements/1.1/}creator'},
        {'header': 'CreatedAt', 'tag': '{http://purl.org/dc/terms/}created'},
        {'header': 'ModifiedAt', 'tag': '{http://purl.org/dc/terms/}modified'},
        {'header': 'SubClassOf', 'tag': '{http://www.w3.org/2000/01/rdf-schema#}subClassOf'},
        {'header': 'Type', 'tag': '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}type'}
    ]

class SecuritySanitizer:
    @staticmethod
    def sanitize_tsv_injection(value: str) -> str:
        """Mitigates CWE-1236 by prefixing formula triggers with a single quote."""
        if not value:
            return value
        if value[0] in ('=', '+', '-', '@'):
            return f"'{value}"
        return value

class OntologyExtractor:
    def __init__(self):
        for prefix, uri in OntologyConfiguration.NAMESPACES.items():
            SecureET.register_namespace(prefix, uri)

    @staticmethod
    def extract_local_name(fully_qualified_tag: str) -> str:
        if '}' not in fully_qualified_tag:
            return fully_qualified_tag
        return fully_qualified_tag.split('}', 1)[1]

    @staticmethod
    def resolve_localized_text(element: Any, tag: str, pref_lang: str = 'en-GB', fall_lang: str = 'en') -> str:
        preferred_value, fallback_value, first_value = None, None, None

        for child in element.iterfind(tag, OntologyConfiguration.NAMESPACES):
            lang = child.get(OntologyConfiguration.XML_LANG)
            text = child.text.strip() if child.text else ''

            if first_value is None:
                first_value = text
            if lang == pref_lang:
                preferred_value = text
                break
            if lang == fall_lang:
                fallback_value = text

        resolved_value = preferred_value or fallback_value or first_value or ''
        return SecuritySanitizer.sanitize_tsv_injection(resolved_value)

    @classmethod
    def extract_uuid(cls, element: Any, tag: str) -> str:
        for identifier in element.iterfind(tag, OntologyConfiguration.NAMESPACES):
            resource = identifier.get(OntologyConfiguration.RDF_RESOURCE)
            if resource and resource.startswith(OntologyConfiguration.UUID_URN_PREFIX):
                return SecuritySanitizer.sanitize_tsv_injection(resource[len(OntologyConfiguration.UUID_URN_PREFIX):])
        return ''

    @classmethod
    def extract_resource_attribute(cls, element: Any, tag: str) -> str:
        target_node = element.find(tag, OntologyConfiguration.NAMESPACES)
        if target_node is not None:
            resource_val = target_node.get(OntologyConfiguration.RDF_RESOURCE)
            if resource_val:
                return SecuritySanitizer.sanitize_tsv_injection(resource_val.strip())
        return ''

    @classmethod
    def extract_text_node(cls, element: Any, tag: str) -> str:
        target_node = element.find(tag, OntologyConfiguration.NAMESPACES)
        if target_node is not None and target_node.text:
            return SecuritySanitizer.sanitize_tsv_injection(target_node.text.strip())
        return ''

class OntologyProcessor:
    def __init__(self, output_path: Path):
        self.output_path = output_path.resolve()
        self.logger = logging.getLogger(self.__class__.__name__)
        self._ensure_output_directory()

    def _ensure_output_directory(self) -> None:
        try:
            self.output_path.parent.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            self.logger.error(f"Failed to provision output directory structure. Verify permissions: {e}")
            sys.exit(1)

    def execute_pipeline(self, input_paths: List[Path]) -> None:
        headers = [field['header'] for field in OntologyConfiguration.FIELDS]
        total_processed = 0

        try:
            with open(self.output_path, 'w', newline='', encoding='utf-8') as tsv_file:
                writer = csv.writer(
                    tsv_file,
                    delimiter=OntologyConfiguration.TSV_DELIMITER,
                    lineterminator=OntologyConfiguration.TSV_TERMINATOR
                )
                writer.writerow(headers)

                for file_path in input_paths:
                    resolved_path = file_path.resolve()
                    if not resolved_path.is_file():
                        self.logger.warning(f"Input verification failed. Path is not a valid file: {file_path}")
                        continue
                    total_processed += self._process_document(file_path, writer)
            
            self.logger.info(f"Pipeline execution complete. Transformed {total_processed} records.")
        except IOError as e:
            self.logger.error(f"Fatal I/O termination during stream write to {self.output_path}: {e}")
            sys.exit(1)

    def _process_document(self, file_path: Path, tsv_writer: Any) -> int:
        self.logger.info(f"Initiating DOM ingestion for: {file_path}")
        processed_count = 0

        try:
            tree = SecureET.parse(str(file_path.resolve()))
            root = tree.getroot()

            for element in root:
                if element.tag not in OntologyConfiguration.TARGET_RECORDS:
                    continue

                record_uri = element.get(OntologyConfiguration.RDF_ABOUT, '')
                if not record_uri.startswith(OntologyConfiguration.DOMAIN_IDENTIFIER):
                    continue

                local_tag_name = OntologyExtractor.extract_local_name(element.tag)
                object_type = 'Class' if local_tag_name == 'Class' else 'Named Individual' if local_tag_name == 'NamedIndividual' else local_tag_name
                
                row_vector = self._compile_record_vector(element, object_type, record_uri)
                tsv_writer.writerow(row_vector)
                processed_count += 1

            return processed_count

        except SecureET.ParseError as e:
            self.logger.error(f"Document structural invalidity detected. XML Parse failure on {file_path.name}: {e}")
            return 0
        except Exception as e:
            self.logger.error(f"Unhandled exception during extraction payload routing: {e}")
            return 0

    def _compile_record_vector(self, element: Any, object_type: str, uri: str) -> List[str]:
        vector = []
        for field in OntologyConfiguration.FIELDS:
            header = field['header']
            tag = field['tag']
            value = ''

            if header == 'Object Type':
                value = object_type
            elif header == 'URI':
                value = SecuritySanitizer.sanitize_tsv_injection(uri)
            elif tag:
                if header == 'UUID':
                    value = OntologyExtractor.extract_uuid(element, tag)
                elif header in ('Label', 'Title', 'Description'):
                    value = OntologyExtractor.resolve_localized_text(element, tag)
                elif header in ('References', 'Creator', 'SubClassOf', 'Type'):
                    value = OntologyExtractor.extract_resource_attribute(element, tag)
                else:
                    value = OntologyExtractor.extract_text_node(element, tag)
            
            vector.append(value)
        return vector

def configure_logging() -> None:
    logging.Formatter.converter = time.gmtime
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%SZ'
    )

def main() -> None:
    configure_logging()
    parser = argparse.ArgumentParser(description="Secure XML Ontology to TSV Extractor.")
    parser.add_argument('input_file_paths', type=Path, nargs='+', help="Authorized XML source file paths.")
    parser.add_argument('output_file_path', type=Path, help="Target destination for transformed TSV data.")

    args = parser.parse_args()

    if not args.input_file_paths:
        logging.error("Execution aborted: Precondition failed. Input source paths undefined.")
        sys.exit(1)

    processor = OntologyProcessor(args.output_file_path)
    processor.execute_pipeline(args.input_file_paths)

if __name__ == '__main__':
    main()
