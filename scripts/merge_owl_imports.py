#!/usr/bin/env python3
"""
OWL Imports Merger

A platform-independent script to flatten an OWL ontology's import closure into a
single self-contained ontology file, resolving imports using OASIS XML catalogs.

Supported Formats:
- RDF/XML (.owl, .rdf)
- Turtle (.ttl)

Design & Best Practices:
1. XML Catalog Resolution: Matches owl:imports URIs to local paths using the
   OASIS XML catalog-v001.xml file, auto-discovering it by traversing up parent
   directories from the input file.
2. Recursive Dependency Loading: Resolves imports recursively using a BFS queue,
   maintaining a visited set to avoid circular import loops.
3. Metadata Discarding: When merging graphs, the script strips the imported
   ontologies' <owl:Ontology> metadata headers. This preserves the base ontology's
   identity and prevents multiple ontology definitions in a single output file.
4. Import Strip: The resolved owl:imports triples pointing to the merged ontologies
   are removed from the base ontology to declare it self-contained.
5. XML Unicode Sanitisation: Under certain conditions (e.g. W3C sdw/time-gregorian.ttl),
   external files contain corrupted strings with control characters (such as U+0008
   and U+0018) caused by naive 16-bit to 8-bit Unicode truncation bugs. These bytes
   are illegal in XML 1.0 and cause parsers (like OWL API / WebVOWL) to crash.
   The script sanitises literal values to strip these out before writing.
6. Atomic Write: Writes the output graph to a staging file first and displaces
   the target file atomically to prevent data corruption during write failures.
"""

import argparse
import os
import sys
import tempfile
import urllib.request
import urllib.parse
import io
import logging
from rdflib import Graph, URIRef, OWL, RDF, Literal
from lxml import etree

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)


def load_catalog(catalog_path: str) -> dict[str, str]:
    """
    Parses catalog-v001.xml and returns a map of ontology IRIs to local file paths.
    Resolves any relative file paths relative to the catalog file's directory.
    Uses a secure XXE-hardened XML parser.
    """
    catalog_map = {}
    if not catalog_path or not os.path.exists(catalog_path):
        return catalog_map

    catalog_dir = os.path.dirname(os.path.abspath(catalog_path))
    try:
        # Secure XML parser for parsing catalog to prevent XXE attacks
        parser = etree.XMLParser(resolve_entities=False, no_network=True)
        tree = etree.parse(catalog_path, parser=parser)
        uris = tree.xpath('//*[local-name()="uri"]')
        for uri_elem in uris:
            name = uri_elem.get("name")
            uri = uri_elem.get("uri")
            if name and uri:
                # If path is relative, resolve it relative to the catalog's folder
                if not os.path.isabs(uri) and not uri.startswith(("http://", "https://")):
                    resolved_path = os.path.abspath(os.path.join(catalog_dir, uri))
                else:
                    resolved_path = uri
                catalog_map[name] = resolved_path
        logging.info(f"Loaded catalog containing {len(catalog_map)} entries from {catalog_path}")
    except Exception as e:
        logging.error(f"Failed to parse catalog file at {catalog_path}: {e}")
    return catalog_map


def find_catalog(start_path: str) -> str | None:
    """
    Climbs up the parent directory tree starting from start_path to locate a
    catalog-v001.xml file. This mirrors Protégé's catalog auto-lookup behavior.
    """
    current_dir = os.path.dirname(os.path.abspath(start_path))
    while True:
        catalog_path = os.path.join(current_dir, "catalog-v001.xml")
        if os.path.exists(catalog_path):
            return catalog_path
        parent_dir = os.path.dirname(current_dir)
        if parent_dir == current_dir:
            break
        current_dir = parent_dir
    return None


def load_ontology(source: str, graph: Graph):
    """
    Loads ontology content into the provided rdflib Graph.
    Attempts parsing as RDF/XML or Turtle format, prioritizing based on file extension.
    Supports local file paths and remote URLs.
    """
    # Prioritize format based on file extension
    formats = []
    if source.lower().endswith((".ttl", ".turtle")):
        formats = ["turtle", "xml"]
    else:
        formats = ["xml", "turtle"]

    content = None
    if source.startswith(("http://", "https://")):
        logging.info(f"Fetching remote ontology: {source}")
        req = urllib.request.Request(
            source,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Antigravity/1.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read()
    else:
        logging.info(f"Loading local ontology: {source}")
        with open(source, "rb") as f:
            content = f.read()

    # Attempt parsing with fallbacks
    for fmt in formats:
        try:
            graph.parse(io.BytesIO(content), format=fmt)
            logging.info(f"Successfully parsed {source} as {fmt}")
            return
        except Exception as e:
            logging.debug(f"Failed to parse {source} as {fmt}: {e}")

    raise ValueError(f"Could not parse ontology content from {source} in any supported format.")


def sanitise_graph_literals(graph: Graph):
    """
    Iterates over all triples in the graph, scanning for Literal objects.
    Strips out XML 1.0 illegal control characters (such as backspaces \\x08 and
    cancel \\x18 codes) from string literals to prevent XML parser fatal errors.
    
    Why: Naive 16-bit to 8-bit Unicode truncation bugs (e.g. in W3C time-gregorian.ttl)
         turn characters like U+6708 (月) and U+0418 (И) into 0x08 and 0x18. While legal
         in Turtle strings, they crash standard XML/OWL API parsers used in WebVOWL.
    """
    # Valid XML 1.0 characters exclude: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F
    invalid_chars = set(list(range(0, 9)) + [11, 12] + list(range(14, 32)))
    for s, p, o in list(graph):
        if isinstance(o, Literal):
            val = str(o)
            # Filter out forbidden ASCII control bytes
            cleaned_val = "".join(c for c in val if ord(c) not in invalid_chars)
            if cleaned_val != val:
                # Rebind literal maintaining datatype and language tag
                new_o = Literal(cleaned_val, datatype=o.datatype, lang=o.language)
                graph.remove((s, p, o))
                graph.add((s, p, new_o))
                logging.info(f"Sanitised invalid XML character from literal {repr(val)} to {repr(cleaned_val)}")


def main():
    parser = argparse.ArgumentParser(description="Flatten OWL imports closure recursively.")
    parser.add_argument("input_file", help="Path to the input OWL ontology file.")
    parser.add_argument("output_file", help="Path to output the merged OWL ontology file.")
    parser.add_argument("--catalog", help="Path to catalog-v001.xml file (auto-searched if omitted).")
    args = parser.parse_args()

    if not os.path.exists(args.input_file):
        logging.error(f"Input file does not exist: {args.input_file}")
        sys.exit(1)

    # 1. Resolve and parse catalog
    catalog_path = args.catalog
    if not catalog_path:
        catalog_path = find_catalog(args.input_file)
        if catalog_path:
            logging.info(f"Auto-discovered catalog file: {catalog_path}")
        else:
            logging.warning("No catalog file found or specified.")

    catalog_map = load_catalog(catalog_path)

    # 2. Parse the base ontology
    base_graph = Graph()
    try:
        load_ontology(args.input_file, base_graph)
    except Exception as e:
        logging.error(f"Failed to load base ontology: {e}")
        sys.exit(1)

    # 3. Retrieve base ontology IRI to locate import triples
    base_iri = None
    ontologies = list(base_graph.subjects(RDF.type, OWL.Ontology))
    if ontologies:
        base_iri = ontologies[0]
        logging.info(f"Base ontology IRI: {base_iri}")
    else:
        logging.warning("Base ontology does not declare an ontology IRI.")

    visited_iris = set()
    if base_iri:
        visited_iris.add(base_iri)

    # 4. Enqueue initial base ontology imports
    initial_imports = []
    if base_iri:
        initial_imports = list(base_graph.objects(base_iri, OWL.imports))

    # Queue contains: (import_iri, source_file_path)
    queue = [(imp_iri, args.input_file) for imp_iri in initial_imports]
    loaded_ontologies = []

    # 5. BFS resolution of nested imports
    while queue:
        imp_iri, source = queue.pop(0)
        if imp_iri in visited_iris:
            continue

        # Try to resolve IRI through catalog mapping
        resolved_source = catalog_map.get(str(imp_iri))
        if not resolved_source:
            # Fallback 1: Check if file with IRI's basename exists in source directory
            parsed_url = urllib.parse.urlparse(str(imp_iri))
            basename = os.path.basename(parsed_url.path)
            if not basename:
                basename = parsed_url.path.replace("/", "_")
            
            candidate = os.path.join(os.path.dirname(os.path.abspath(source)), basename)
            if os.path.exists(candidate):
                resolved_source = candidate
            else:
                # Check relative to catalog directory
                if catalog_path:
                    candidate = os.path.join(os.path.dirname(os.path.abspath(catalog_path)), basename)
                    if os.path.exists(candidate):
                        resolved_source = candidate

        if not resolved_source:
            # Fallback 2: Check if HTTP/HTTPS URL
            if str(imp_iri).startswith(("http://", "https://")):
                resolved_source = str(imp_iri)
            else:
                logging.error(f"Could not resolve import: {imp_iri} (imported by {source})")
                continue

        # Load imported ontology into a separate graph
        imp_graph = Graph()
        try:
            load_ontology(resolved_source, imp_graph)
            visited_iris.add(imp_iri)
            loaded_ontologies.append((imp_iri, imp_graph))
            logging.info(f"Successfully loaded import: {imp_iri}")

            # Enqueue nested imports of this dependency
            imp_onts = list(imp_graph.subjects(RDF.type, OWL.Ontology))
            if imp_onts:
                imp_ont_iri = imp_onts[0]
                nested_imports = list(imp_graph.objects(imp_ont_iri, OWL.imports))
                for nested in nested_imports:
                    if nested not in visited_iris:
                        queue.append((nested, resolved_source))
        except Exception as e:
            logging.error(f"Failed to load import {imp_iri} from {resolved_source}: {e}")

    # 6. Remove owl:imports statements from the base ontology
    if base_iri:
        for imp_iri in visited_iris:
            base_graph.remove((base_iri, OWL.imports, imp_iri))
            logging.info(f"Removed imports declaration: {imp_iri}")

    # 7. Merge imported graphs into base graph
    for imp_iri, imp_graph in loaded_ontologies:
        # Determine imported ontology IRI to skip its metadata
        imp_onts = list(imp_graph.subjects(RDF.type, OWL.Ontology))
        imp_ont_iri = imp_onts[0] if imp_onts else None

        # Bind namespaces from imported graph
        for prefix, ns in imp_graph.namespaces():
            base_graph.bind(prefix, ns, override=False)

        # Merge triples (excluding imported ontology header metadata)
        for s, p, o in imp_graph:
            if imp_ont_iri and s == imp_ont_iri:
                # Discard metadata triples of the imported ontology
                continue
            base_graph.add((s, p, o))

    # 8. Sanitise literal values to remove XML-illegal control characters
    sanitise_graph_literals(base_graph)

    # 9. Write output file atomically to prevent data corruption
    output_dir = os.path.dirname(os.path.abspath(args.output_file)) or "."
    if output_dir != ".":
        os.makedirs(output_dir, exist_ok=True)

    with tempfile.NamedTemporaryFile(mode="wb", delete=False, dir=output_dir, suffix=".owl") as temp_file:
        temp_file_path = temp_file.name
        try:
            base_graph.serialize(destination=temp_file, format="xml")
            temp_file.flush()
            os.fsync(temp_file.fileno())
        except Exception as e:
            os.remove(temp_file_path)
            logging.error(f"Failed to serialize merged ontology graph: {e}")
            sys.exit(1)

    try:
        os.replace(temp_file_path, args.output_file)
        logging.info(f"Successfully generated merged ontology: {args.output_file}")
    except OSError as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        logging.error(f"Failed to write output file atomically: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
