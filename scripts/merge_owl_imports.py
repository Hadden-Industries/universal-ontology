#!/usr/bin/env python3
"""
OWL Imports Merger

A platform-independent script to flatten an OWL ontology's import closure into a
single self-contained ontology file, resolving imports using OASIS XML catalogs.
Supports RDF/XML (.owl, .rdf) and Turtle (.ttl) formats using rdflib.
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
    """Parses catalog-v001.xml and returns a map of ontology IRIs to local file paths."""
    catalog_map = {}
    if not catalog_path or not os.path.exists(catalog_path):
        return catalog_map

    catalog_dir = os.path.dirname(os.path.abspath(catalog_path))
    try:
        # Secure XML parser for catalog
        parser = etree.XMLParser(resolve_entities=False, no_network=True)
        tree = etree.parse(catalog_path, parser=parser)
        uris = tree.xpath('//*[local-name()="uri"]')
        for uri_elem in uris:
            name = uri_elem.get("name")
            uri = uri_elem.get("uri")
            if name and uri:
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
    """Climbs up parent directories from start_path to find catalog-v001.xml."""
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
    """Loads ontology content into the graph, attempting RDF/XML and Turtle formats."""
    # Prioritize format based on extension
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

    for fmt in formats:
        try:
            graph.parse(io.BytesIO(content), format=fmt)
            logging.info(f"Successfully parsed {source} as {fmt}")
            return
        except Exception as e:
            logging.debug(f"Failed to parse {source} as {fmt}: {e}")

    raise ValueError(f"Could not parse ontology content from {source} in any supported format.")


def sanitise_graph_literals(graph: Graph):
    """Strips invalid XML 1.0 control characters from string literal values to ensure parser compatibility."""
    # Invalid XML 1.0 characters: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F
    invalid_chars = set(list(range(0, 9)) + [11, 12] + list(range(14, 32)))
    for s, p, o in list(graph):
        if isinstance(o, Literal):
            val = str(o)
            cleaned_val = "".join(c for c in val if ord(c) not in invalid_chars)
            if cleaned_val != val:
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

    catalog_path = args.catalog
    if not catalog_path:
        catalog_path = find_catalog(args.input_file)
        if catalog_path:
            logging.info(f"Auto-discovered catalog file: {catalog_path}")
        else:
            logging.warning("No catalog file found or specified.")

    catalog_map = load_catalog(catalog_path)

    # Initialize base graph
    base_graph = Graph()
    try:
        load_ontology(args.input_file, base_graph)
    except Exception as e:
        logging.error(f"Failed to load base ontology: {e}")
        sys.exit(1)

    # Find base ontology IRI
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

    # Find initial imports
    initial_imports = []
    if base_iri:
        initial_imports = list(base_graph.objects(base_iri, OWL.imports))

    # Queue of (import_iri, source_file_path)
    queue = [(imp_iri, args.input_file) for imp_iri in initial_imports]
    loaded_ontologies = []

    while queue:
        imp_iri, source = queue.pop(0)
        if imp_iri in visited_iris:
            continue

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

            # Enqueue nested imports
            imp_onts = list(imp_graph.subjects(RDF.type, OWL.Ontology))
            if imp_onts:
                imp_ont_iri = imp_onts[0]
                nested_imports = list(imp_graph.objects(imp_ont_iri, OWL.imports))
                for nested in nested_imports:
                    if nested not in visited_iris:
                        queue.append((nested, resolved_source))
        except Exception as e:
            logging.error(f"Failed to load import {imp_iri} from {resolved_source}: {e}")

    # Remove the resolved imports from the base ontology
    if base_iri:
        for imp_iri in visited_iris:
            base_graph.remove((base_iri, OWL.imports, imp_iri))
            logging.info(f"Removed imports declaration: {imp_iri}")

    # Merge graphs
    for imp_iri, imp_graph in loaded_ontologies:
        # Determine imported ontology IRI to skip its metadata
        imp_onts = list(imp_graph.subjects(RDF.type, OWL.Ontology))
        imp_ont_iri = imp_onts[0] if imp_onts else None

        # Bind namespaces
        for prefix, ns in imp_graph.namespaces():
            base_graph.bind(prefix, ns, override=False)

        # Merge triples (excluding imported ontology metadata)
        for s, p, o in imp_graph:
            if imp_ont_iri and s == imp_ont_iri:
                # Discard metadata triples of the imported ontology
                continue
            base_graph.add((s, p, o))

    # Sanitise literal values to remove invalid XML control characters
    sanitise_graph_literals(base_graph)

    # Write output file atomically
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
