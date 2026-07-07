import argparse
import os
import sys
import logging
from lxml import etree

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)

def create_secure_xml_parser() -> etree.XMLParser:
    """
    Constructs an XML parser hardened against XML External Entity (XXE) attacks.
    """
    return etree.XMLParser(
        resolve_entities=False,
        no_network=True,
        remove_blank_text=False,
        strip_cdata=False
    )

def convert_owl_to_uml_xmi(owl_path: str, xslt_path: str, output_path: str) -> None:
    """
    Converts OWL RDF/XML to OMG UML XMI 2.1 using lxml XSLT processing.
    """
    if not os.path.isfile(owl_path):
        logging.error(f"Source OWL file does not exist or is inaccessible: {owl_path}")
        sys.exit(1)
        
    if not os.path.isfile(xslt_path):
        logging.error(f"XSLT document does not exist or is inaccessible: {xslt_path}")
        sys.exit(1)

    secure_parser = create_secure_xml_parser()

    try:
        xml_dom = etree.parse(owl_path, parser=secure_parser)
    except etree.XMLSyntaxError as error:
        logging.error(f"Syntax error encountered during XML parsing of OWL: {error}")
        sys.exit(1)

    try:
        xslt_dom = etree.parse(xslt_path, parser=secure_parser)
        xslt_processor = etree.XSLT(xslt_dom)
    except etree.XMLSyntaxError as error:
        logging.error(f"Syntax error encountered during XML parsing of XSLT: {error}")
        sys.exit(1)
    except etree.XSLTParseError as error:
        logging.error("Invalid XSLT structure provided. Parse Error Traceback:")
        for log_entry in error.error_log:
            logging.error(f"Line {log_entry.line}: {log_entry.message}")
        sys.exit(1)

    try:
        transformed_xml_dom = xslt_processor(xml_dom)
    except etree.XSLTApplyError:
        logging.error("XSLT application failed. Engine Error Traceback:")
        for log_entry in xslt_processor.error_log:
            logging.error(f"Line {log_entry.line}: {log_entry.message}")
        sys.exit(1)

    # Ensure target output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    try:
        transformed_xml_dom.write(
            output_path,
            encoding='UTF-8',
            xml_declaration=True,
            pretty_print=True
        )
    except Exception as write_error:
        logging.error(f"Failed to write output file '{output_path}': {write_error}")
        sys.exit(1)

    logging.info(f"Successfully converted '{owl_path}' to UML XMI at '{output_path}' using '{xslt_path}'.")

def main() -> None:
    argument_parser = argparse.ArgumentParser(
        description="Converts OWL RDF/XML ontology to OMG UML XMI 2.1 using XSLT."
    )
    argument_parser.add_argument("owl_file", help="Path to the input OWL RDF/XML document.")
    argument_parser.add_argument("output_file", help="Path to the output UML XMI document.")
    argument_parser.add_argument(
        "--xslt", 
        default=os.path.join(os.path.dirname(__file__), "owl_to_uml_xmi.xsl"),
        help="Path to the XSLT stylesheet (defaults to scripts/owl_to_uml_xmi.xsl)."
    )
    
    parsed_arguments = argument_parser.parse_args()
    convert_owl_to_uml_xmi(
        parsed_arguments.owl_file, 
        parsed_arguments.xslt, 
        parsed_arguments.output_file
    )

if __name__ == "__main__":
    main()
