# https://gemini.google.com/app/962e896b8d448170
import argparse
import os
import sys
import tempfile
import logging
import re
from lxml import etree

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)

def create_secure_xml_parser() -> etree.XMLParser:
    """
    Constructs an XML parser hardened against XML External Entity (XXE) attacks.
    Explicitly retains blank text and CDATA for interior node formatting.
    """
    return etree.XMLParser(
        resolve_entities=False,
        no_network=True,
        remove_blank_text=False,
        strip_cdata=False
    )

def resolve_element_qname(element: etree._Element) -> str:
    """
    Resolves the exact lexical QName string of an element to map namespaces accurately.
    """
    qname = etree.QName(element)
    if element.prefix:
        return f"{element.prefix}:{qname.localname}"
    return qname.localname

def extract_lexical_boundaries(xml_text: str, root_tag: str) -> tuple[str, str, str]:
    """
    Isolates the lexically significant boundaries of an XML document.
    Returns a tuple containing: (preamble, interior_content, postamble).
    """
    pre_pattern = re.compile(rf"^([\s\S]*?<{root_tag}[^>]*>)", re.IGNORECASE)
    post_pattern = re.compile(rf"(</{root_tag}>[\s\S]*)$", re.IGNORECASE)
    
    pre_match = pre_pattern.search(xml_text)
    post_match = post_pattern.search(xml_text)
    
    if not pre_match or not post_match:
        raise ValueError("Failed to match structural boundaries of the root element. File may use self-closing root tags.")
        
    preamble = pre_match.group(1)
    postamble = post_match.group(1)
    interior = xml_text[pre_match.end():post_match.start()]
    
    return preamble, interior, postamble

def atomically_write_string(payload: str, target_file_path: str) -> None:
    """
    Persists a raw string to the filesystem using atomic displacement, ensuring 
    durability against power loss or crashes during serialization.
    """
    directory_path = os.path.dirname(target_file_path) or '.'
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', newline='', delete=False, dir=directory_path, suffix='.xml') as staging_file:
        staging_file_path = staging_file.name
        try:
            staging_file.write(payload)
            staging_file.flush()
            os.fsync(staging_file.fileno())
        except Exception as write_error:
            os.remove(staging_file_path)
            raise RuntimeError("Serialization of patched string to staging file failed.") from write_error

    try:
        os.replace(staging_file_path, target_file_path)
    except OSError as replacement_error:
        os.remove(staging_file_path)
        raise RuntimeError("Atomic replacement of target XML file failed.") from replacement_error

def atomically_write_xml(transformed_dom: etree._XSLTResultTree, target_file_path: str) -> None:
    """
    Fallback method: Serializes the pure DOM tree atomically if string-level patching fails.
    """
    directory_path = os.path.dirname(target_file_path) or '.'
    with tempfile.NamedTemporaryFile(delete=False, dir=directory_path, suffix='.xml') as staging_file:
        staging_file_path = staging_file.name
        try:
            transformed_dom.write(
                staging_file_path,
                encoding='UTF-8',
                xml_declaration=True,
                pretty_print=False
            )
            staging_file.flush()
            os.fsync(staging_file.fileno())
        except Exception as write_error:
            os.remove(staging_file_path)
            raise RuntimeError("DOM Serialization to staging file failed.") from write_error

    try:
        os.replace(staging_file_path, target_file_path)
    except OSError as replacement_error:
        os.remove(staging_file_path)
        raise RuntimeError("Atomic replacement of target XML file failed.") from replacement_error

def apply_xslt_in_place(xml_file_path: str, xslt_file_path: str) -> None:
    """
    Orchestrates the secure parsing, transformation, lexical boundary patching, 
    and atomic replacement of an XML file.
    """
    if not os.path.isfile(xml_file_path):
        logging.error("Source XML file does not exist or is inaccessible.")
        sys.exit(1)
        
    if not os.path.isfile(xslt_file_path):
        logging.error("XSLT document does not exist or is inaccessible.")
        sys.exit(1)

    secure_parser = create_secure_xml_parser()

    try:
        xml_dom = etree.parse(xml_file_path, parser=secure_parser)
    except etree.XMLSyntaxError as error:
        logging.error(f"Syntax error encountered during XML parsing: {error}")
        sys.exit(1)

    try:
        xslt_dom = etree.parse(xslt_file_path, parser=secure_parser)
        xslt_processor = etree.XSLT(xslt_dom)
    except etree.XMLSyntaxError as error:
        logging.error(f"Syntax error encountered during XSLT parsing: {error}")
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

    try:
        root_tag_name = resolve_element_qname(xml_dom.getroot())
        
        with open(xml_file_path, 'r', encoding='utf-8', newline='') as file_descriptor:
            original_text = file_descriptor.read()
            
            file_newlines = file_descriptor.newlines
            if isinstance(file_newlines, tuple):
                original_newline = '\n'
            elif isinstance(file_newlines, str):
                original_newline = file_newlines
            else:
                original_newline = os.linesep
                
        orig_preamble, _, orig_postamble = extract_lexical_boundaries(original_text, root_tag_name)
        
        transformed_text = bytes(transformed_xml_dom).decode('utf-8')
        _, trans_interior, _ = extract_lexical_boundaries(transformed_text, root_tag_name)
        
        trans_interior = trans_interior.replace('\r\n', '\n').replace('\r', '\n')
        if original_newline != '\n':
            trans_interior = trans_interior.replace('\n', original_newline)
        
        final_xml_payload = orig_preamble + trans_interior + orig_postamble
        atomically_write_string(final_xml_payload, xml_file_path)
        
    except Exception as lexical_error:
        logging.warning("Lexical mapping failed. Degraded to standard DOM serialization. Reason: %s", str(lexical_error))
        try:
            atomically_write_xml(transformed_xml_dom, xml_file_path)
        except RuntimeError:
            logging.error("Failed to commit fallback DOM changes to the filesystem safely.")
            sys.exit(1)
    except RuntimeError:
        logging.error("Failed to commit patched string changes to the filesystem safely.")
        sys.exit(1)

    logging.info("Successfully transformed '%s' in-place using '%s'.", xml_file_path, xslt_file_path)

def main() -> None:
    """
    CLI entry boundary. Validates external inputs before passing to business logic.
    """
    argument_parser = argparse.ArgumentParser(
        description="Securely applies an XSLT transformation to an XML document in-place, preserving absolute structural formatting."
    )
    argument_parser.add_argument("xml_file", help="Path to the target XML document.")
    argument_parser.add_argument("xslt_file", help="Path to the XSLT stylesheet.")
    
    parsed_arguments = argument_parser.parse_args()
    apply_xslt_in_place(parsed_arguments.xml_file, parsed_arguments.xslt_file)

if __name__ == "__main__":
    main()