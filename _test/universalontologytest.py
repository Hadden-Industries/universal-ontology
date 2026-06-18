#! python
# Hadden Industries Universal Ontology Test
import itertools
import re

from pathlib import Path
from uuid import UUID
from xmlunittest import XmlTestCase

def is_pascal_case(identifier: str) -> bool:
	"""
	Tests if a string strictly conforms to the PascalCase naming convention.
	
	Rules enforced:
	1. Must start with an uppercase letter (A-Z).
	2. Must contain only alphanumeric characters (a-z, A-Z, 0-9).
	3. Rejects any separators (spaces, underscores, and hyphens).
	
	Args:
		identifier (str): The local name or URI fragment to test.
		
	Returns:
		bool: True if it is valid PascalCase, False otherwise.
	"""
	if not isinstance(identifier, str) or not identifier:
		return False
		
	# The pragmatic, widely-accepted pattern for PascalCase
	# ^[A-Z]       : Must start with an uppercase letter
	# [a-zA-Z0-9]* : Followed by any combination of alphanumeric characters
	# $            : Until the end of the string
	pattern = re.compile(r"^[A-Z][a-zA-Z0-9]*$")
	
	return bool(pattern.fullmatch(identifier))

def is_camel_case(identifier: str) -> bool:
	"""
	Tests if a string strictly conforms to the camelCase naming convention.
	
	Rules enforced:
	1. Must start with an lowercase letter (a-z).
	2. Must contain only alphanumeric characters (a-z, A-Z, 0-9).
	3. Rejects any separators (spaces, underscores, and hyphens).
	
	Args:
		identifier (str): The local name or URI fragment to test.
		
	Returns:
		bool: True if it is valid camelCase, False otherwise.
	"""
	if not isinstance(identifier, str) or not identifier:
		return False
		
	# The pragmatic, widely-accepted pattern for camelCase
	# ^[a-z]       : Must start with an lowercase letter
	# [a-zA-Z0-9]* : Followed by any combination of alphanumeric characters
	# $            : Until the end of the string
	pattern = re.compile(r"^[a-z][a-zA-Z0-9]*$")
	
	return bool(pattern.fullmatch(identifier))

def is_snake_case(identifier: str) -> bool:
	"""
	Tests if a string strictly conforms to a relaxed snake_case naming convention.
	
	Rules enforced:
	1. Must contain only letters (a-z, A-Z), numbers (0-9), and underscores (_).
	2. Must not start or end with an underscore.
	3. Must not contain consecutive underscores.
	
	Args:
		identifier (str): The local name or URI fragment to test.
		
	Returns:
		bool: True if it is valid snake_case, False otherwise.
	"""
	if not isinstance(identifier, str) or not identifier:
		return False
		
	# The pragmatic, widely-accepted pattern for snake_case (case-insensitive)
	# ^[a-zA-Z0-9]+      : Must start with one or more alphanumeric characters
	# (?:_[a-zA-Z0-9]+)* : Followed by zero or more groups of a single underscore and alphanumeric characters
	# $                  : Until the end of the string
	pattern = re.compile(r"^[a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)*$")
	
	return bool(pattern.fullmatch(identifier))

class UniversalOntologyTest(XmlTestCase):

	def run_on_path(self, file_path: Path):
		
		# 1. Parse the XML document first so we can read its self-declared metadata
		root = self.assertXmlDocument(file_path.read_text(encoding='utf-8'))
		
		# Lookup the ontology element once to optimize parsing
		ontologyElement = root.find('{http://www.w3.org/2002/07/owl#}Ontology')
		
		# 2. Dynamically extract the base namespace
		# Primary fallback: check xml:base on the root <rdf:RDF> element
		ns = root.get('{http://www.w3.org/XML/1998/namespace}base')
		
		# Secondary fallback: check rdf:about on the <owl:Ontology> element
		if not ns and ontologyElement is not None:
			ns = ontologyElement.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about')
		
		# Failsafe
		if not ns:
			self.fail('Ontology validation failed: Could not dynamically determine namespace (xml:base or owl:Ontology rdf:about) for file.')
			
		# Ensure trailing slash to allow strict URI removal later
		if not ns.endswith('/'):
			ns += '/'
			
		# Check namespace consistency early (Fail Fast)
		self.assertXmlNamespace(root, None, ns)
		
		# Build a map of children to parents to resolve parent attributes in global checks
		parent_map = {c: p for p in root.iter() for c in p}
		
		# Global xml:lang attribute requirement across all entities
		for global_lang_tag in [
			'{http://purl.org/dc/terms/}description',
			'{http://purl.org/dc/terms/}title',
			'{http://www.w3.org/2000/01/rdf-schema#}label',
			'{http://www.w3.org/2000/01/rdf-schema#}comment',
			'{http://www.w3.org/2004/02/skos/core#}definition',
			'{http://www.w3.org/2004/02/skos/core#}prefLabel',
			'{http://purl.org/dc/terms/}alternative',
			'{https://haddenindustries.com/ontology/universal/core/}acronym',
			'{https://haddenindustries.com/ontology/universal/core/}synonym'
		]:
			for instance in root.iter(global_lang_tag):
				if instance.get('{http://www.w3.org/XML/1998/namespace}lang') is None:
					parent = parent_map.get(instance)
					parent_about = parent.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about', 'Unknown') if parent is not None else 'Unknown'
					self.fail('%s is missing xml:lang attribute on parent "%s". Text: "%s"' % (global_lang_tag.split('}')[-1], parent_about, instance.text))
		
		# Global uniqueness for dcterms:identifier
		identifiersList = []
		for identifier in root.iter('{http://purl.org/dc/terms/}identifier'):
			identifierRdfResource = identifier.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
			if identifierRdfResource is not None:
				if identifierRdfResource in identifiersList:
					self.fail('another element with dcterms:identifier "%s" already exists' % identifierRdfResource)
				identifiersList.append(identifierRdfResource)
		
		# Global skos:prefLabel requirement for core entity types
		for entity_tag in [
			'{http://www.w3.org/2002/07/owl#}Class',
			'{http://www.w3.org/2002/07/owl#}NamedIndividual',
			'{http://www.w3.org/2002/07/owl#}ObjectProperty',
			'{http://www.w3.org/2002/07/owl#}DatatypeProperty'
		]:
			for elem in root.iter(entity_tag):
				entity_about = elem.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about')
				if entity_about is not None and entity_about.startswith('https://haddenindustries.com/ontology/'):
					if not entity_about.startswith('https://haddenindustries.com/ontology/dataset/') and not entity_about.startswith('https://haddenindustries.com/ontology/distribution/'):
						if elem.find('{http://www.w3.org/2004/02/skos/core#}prefLabel') is None:
							self.fail('Ontology constraint breach: %s "%s" is missing a skos:prefLabel child element' % (entity_tag.split('}')[-1], entity_about))
							
						self.assertXpathsUniqueValue(elem, ['./skos:prefLabel/@xml:lang'])
						
						# Determine expected tail for label matching
						entity_about_tail = entity_about.split('/')[-1].split('#')[-1]
							
						hasEnglishPrefLabel = False
						
						for prefLabel in elem.iterfind('{http://www.w3.org/2004/02/skos/core#}prefLabel'):
						
							prefLabelXmlLang = prefLabel.get('{http://www.w3.org/XML/1998/namespace}lang')
							
							if prefLabelXmlLang.partition('-')[0] == 'en':
								if not hasEnglishPrefLabel:
									hasEnglishPrefLabel = True
							
							if prefLabelXmlLang == 'en' or prefLabelXmlLang == 'en-gb':
								
								transformed_pref_label_text = prefLabel.text
								# According to the W3C XML specification, the local part of a QName (the part after the colon) must be a valid NCName, and cannot start with a digit
								# Semantic Web and OOP communities use the approach of spelling out the number
								if transformed_pref_label_text and transformed_pref_label_text[0] in '0123456789':
									digit_map = {'0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'}
									transformed_pref_label_text = digit_map[transformed_pref_label_text[0]] + transformed_pref_label_text[1:]
								
								test_about_tail = entity_about_tail
								if entity_tag in [
									'{http://www.w3.org/2002/07/owl#}NamedIndividual',
									'{http://www.w3.org/2002/07/owl#}ObjectProperty',
									'{http://www.w3.org/2002/07/owl#}DatatypeProperty'
								]:
									# Remove prefix up to and including the first underscore for testing
									if test_about_tail and test_about_tail[0].isupper():
										test_about_tail = test_about_tail.split('_', 1)[-1]
								
								if not re.sub(r'[^a-zA-Z0-9]+', '', transformed_pref_label_text).lower() == re.sub(r'[^a-zA-Z0-9]+', '', test_about_tail).lower():
									self.fail('en or en-gb skos:prefLabel "%s" does not correspond to the rdf:about: %s' % (prefLabel.text, entity_about))
							
							has_exact_match = False
							for label in elem.iterfind('{http://www.w3.org/2000/01/rdf-schema#}label'):
								if label.get('{http://www.w3.org/XML/1998/namespace}lang') == prefLabelXmlLang:
									if prefLabel.text == label.text:
										has_exact_match = True
										break
							
							if not has_exact_match:
								self.fail('skos:prefLabel "%s" with xml:lang "%s" does not have an exact matching rdfs:label in the same language for entity: %s' % (prefLabel.text, prefLabelXmlLang, entity_about))
								
						if not hasEnglishPrefLabel:
							self.fail('English skos:prefLabel not found for entity: %s' % entity_about)
		
		labelsList = []

		if ontologyElement is not None:
			
			versionIriElement = ontologyElement.find('{http://www.w3.org/2002/07/owl#}versionIRI')
			if versionIriElement is None:
				self.fail('owl:versionIRI does not exist in owl:Ontology')
			
			versionIriResource = versionIriElement.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
			if not versionIriResource:
				self.fail('owl:versionIRI does not have an rdf:resource attribute')
				
			versionIriTail = versionIriResource.rstrip('/').split('/')[-1]
			
			versionInfoElement = ontologyElement.find('{http://www.w3.org/2002/07/owl#}versionInfo')
			if versionInfoElement is None or not versionInfoElement.text:
				self.fail('owl:versionInfo does not exist or is empty in owl:Ontology')
				
			versionInfoDehyphened = str.replace(versionInfoElement.text, '-', '')
			
			if versionIriTail != versionInfoDehyphened:
				self.fail('Ontology version metadata mismatch. versionIRI tail: "%s", versionInfo de-hyphened: "%s"' % (versionIriTail, versionInfoDehyphened))
			
			modifiedElement = ontologyElement.find('{http://purl.org/dc/terms/}modified')
			if modifiedElement is not None and modifiedElement.text:
				modifiedDehyphened = str.replace(modifiedElement.text, '-', '')
				if versionIriTail != modifiedDehyphened:
					self.fail('Ontology version metadata mismatch. versionIRI tail: "%s", modified de-hyphened: "%s"' % (versionIriTail, modifiedDehyphened))

		for elem in itertools.chain(
			root.iterfind('{http://www.w3.org/2002/07/owl#}Class'),
			root.iterfind('{http://www.w3.org/2002/07/owl#}NamedIndividual'),
			root.iterfind('{http://www.w3.org/2002/07/owl#}ObjectProperty'),
			root.iterfind('{http://www.w3.org/2002/07/owl#}DatatypeProperty')
			):
			
			entityRdfAbout = elem.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about')
			
			# Check restored to prevent TypeError crashes on incomplete tags
			if entityRdfAbout is None:
				self.fail("Entity is missing 'rdf:about' attribute.")
			
			if elem.tag == '{http://www.w3.org/2002/07/owl#}NamedIndividual':
				is_dataset = False
				is_distribution = False
				for rdf_type in elem.iterfind('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}type'):
					type_resource = rdf_type.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
					if type_resource == 'http://www.w3.org/ns/dcat#Dataset':
						is_dataset = True
					elif type_resource == 'http://www.w3.org/ns/dcat#Distribution':
						is_distribution = True
				
				if is_dataset:
					has_valid_theme = False
					for theme in elem.iterfind('{http://www.w3.org/ns/dcat#}theme'):
						theme_resource = theme.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
						if theme_resource and theme_resource.strip():
							has_valid_theme = True
							break
					
					if not has_valid_theme:
						self.fail('owl:NamedIndividual Dataset "%s" is missing a dcat:theme with a non-empty rdf:resource' % entityRdfAbout)
						
					title_elem = elem.find('{http://purl.org/dc/terms/}title')
					if title_elem is None or not title_elem.text or not title_elem.text.strip():
						self.fail('owl:NamedIndividual Dataset "%s" is missing a dcterms:title child element with a non-empty value' % entityRdfAbout)
						
					label_elem = elem.find('{http://www.w3.org/2000/01/rdf-schema#}label')
					if label_elem is None or not label_elem.text or not label_elem.text.strip():
						self.fail('owl:NamedIndividual Dataset "%s" is missing a rdfs:label child element with a non-empty value' % entityRdfAbout)
						
					desc_elem = elem.find('{http://purl.org/dc/terms/}description')
					if desc_elem is None or not desc_elem.text or not desc_elem.text.strip():
						self.fail('owl:NamedIndividual Dataset "%s" is missing a dcterms:description child element with a non-empty value' % entityRdfAbout)
						
				if is_distribution:
					access_url_elem = elem.find('{http://www.w3.org/ns/dcat#}accessURL')
					if access_url_elem is None:
						self.fail('owl:NamedIndividual Distribution "%s" is missing a dcat:accessURL child element' % entityRdfAbout)
					else:
						resource_attr = access_url_elem.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
						if not resource_attr or not resource_attr.strip():
							self.fail('owl:NamedIndividual Distribution "%s" has a dcat:accessURL with an empty or missing rdf:resource attribute' % entityRdfAbout)
							
					label_elem = elem.find('{http://www.w3.org/2000/01/rdf-schema#}label')
					if label_elem is None or not label_elem.text or not label_elem.text.strip():
						self.fail('owl:NamedIndividual Distribution "%s" is missing a rdfs:label child element with a non-empty value' % entityRdfAbout)
			
			if entityRdfAbout.startswith(ns):
				
				entityRdfAboutTail = entityRdfAbout.split('/')[-1].split('#')[-1]
				
				if elem.tag in ['{http://www.w3.org/2002/07/owl#}Class', '{http://www.w3.org/2002/07/owl#}NamedIndividual']:
					if elem.tag == '{http://www.w3.org/2002/07/owl#}NamedIndividual':
						
						# Remove prefix up to and including the first underscore for PascalCase testing
						pascal_case_test_string = entityRdfAboutTail.split('_', 1)[-1]
					
					else:
					
						pascal_case_test_string = entityRdfAboutTail
					
					if not is_pascal_case(pascal_case_test_string):
						self.fail('Entity name "%s" does not conform to PascalCase' % entityRdfAboutTail)
					
				try:
					# Creator
					self.assertXpathsOnlyOne(elem, ['./dc:creator'])
					
					if elem.find('{http://purl.org/dc/elements/1.1/}creator') is None:
						
						self.fail('dc:creator does not exist')
					
					creatorResourceValue = elem.find('{http://purl.org/dc/elements/1.1/}creator').get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
					
					if not (creatorResourceValue.startswith('http://orcid.org/') or creatorResourceValue.startswith('https://orcid.org/')):
						self.fail('dc:creator "%s" is not an ORCID iD' % creatorResourceValue)
					
					# Created at date and time
					self.assertXpathsOnlyOne(elem, ['./dcterms:created'])
					
					createdFirstElement = elem.find('{http://purl.org/dc/terms/}created')
					
					self.assertXmlHasAttribute(createdFirstElement, '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}datatype', expected_value = 'http://www.w3.org/2001/XMLSchema#dateTime')
					
					if not createdFirstElement.text[-1:] == 'Z':
						self.fail('dcterms:created "%s" is not a UTC value' % createdFirstElement.text)
					
					# Modified at date and time
					if len(elem.findall('{http://purl.org/dc/terms/}modified')) > 1:
						entity_type_name = "owl:" + elem.tag.split('}')[-1]
						self.fail('%s "%s" has more than one dcterms:modified' % (entity_type_name, entityRdfAbout))

					modifiedFirstElement = elem.find('{http://purl.org/dc/terms/}modified')
					
					if modifiedFirstElement is not None:
						self.assertXpathsOnlyOne(elem, ['./dcterms:modified'])
						
						modifiedFirstElementDatatype = modifiedFirstElement.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}datatype')
						
						if modifiedFirstElementDatatype is not None:
							
							if modifiedFirstElementDatatype == 'http://www.w3.org/2001/XMLSchema#dateTime':
								if not modifiedFirstElement.text[-1:] == 'Z':
									self.fail('dcterms:modified "%s" is not a UTC value' % modifiedFirstElement.text)
							elif not modifiedFirstElementDatatype == 'http://www.w3.org/2001/XMLSchema#date':
								self.fail('dcterms:modified has invalid rdf:datatype of "%s"' % modifiedFirstElementDatatype)
							
						else:
							
							self.fail('dcterms:modified has no rdf:datatype')
					
					# Contributors
					contributorFirstElement = elem.find('{http://purl.org/dc/elements/1.1/}contributor')
					
					if contributorFirstElement is not None:
						self.assertXpathsUniqueValue(elem, ['./dc:contributor/@rdf:resource'])
						
					for contributor in elem.iterfind('{http://purl.org/dc/elements/1.1/}contributor'):
						contributorResourceValue = contributor.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
						if not (contributorResourceValue.startswith('http://orcid.org/') or contributorResourceValue.startswith('https://orcid.org/')):
							self.fail('dc:contributor "%s" is not an ORCID iD' % contributorResourceValue)
					
					if elem.tag in ['{http://www.w3.org/2002/07/owl#}Class', '{http://www.w3.org/2002/07/owl#}NamedIndividual']:
						# Identifiers
						self.assertXpathsExist(elem, ['./dcterms:identifier'])
						
						hasUuidIdentifier = False
						
						for identifier in elem.iterfind('{http://purl.org/dc/terms/}identifier'):
							
							identifierRdfResource = identifier.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
							
							if identifierRdfResource is not None:
								
								if identifierRdfResource.startswith('urn:uuid:'):
									
									if not hasUuidIdentifier:
										hasUuidIdentifier = True
									try:
										UuidValue = UUID(identifierRdfResource[len('urn:uuid:'):], version = 4)
									except ValueError:
										self.fail('dcterms:identifier "%s" is not a valid version 4 UUID' % identifierRdfResource[len('urn:uuid:'):])
									
						if not hasUuidIdentifier:
							self.fail('dcterms:identifier of type UUID not found')				
						
						# Labels
						
						if entityRdfAbout.startswith('https://haddenindustries.com/ontology/universal/'):
						
							self.assertXpathsExist(elem, ['./rdfs:label'])
							
							hasEnglishLabel = False
							
							for label in elem.iterfind('{http://www.w3.org/2000/01/rdf-schema#}label'):
									
								labelXmlLang = label.get('{http://www.w3.org/XML/1998/namespace}lang')
								
								# Check all labels are unique by text and language
								if (label.text, labelXmlLang) in labelsList:
									
									self.fail('another element with rdfs:label "%s" and xml:lang "%s" already exists' % (label.text, labelXmlLang))
								
								labelsList.append((label.text, labelXmlLang))
								
								if labelXmlLang.partition('-')[0] == 'en':
									if not hasEnglishLabel:
										hasEnglishLabel = True
											
							if not hasEnglishLabel:
								self.fail('en rdfs:label not found')
						
						# Definitions
						self.assertXpathsExist(elem, ['./skos:definition'])
						self.assertXpathsUniqueValue(elem, ['./skos:definition/@xml:lang'])
						
						# Descriptions
						self.assertXpathsUniqueValue(elem, ['./dcterms:description/@xml:lang'])
						
				except:
					print(entityRdfAboutTail)
					raise
					
		# Property camelCase rdf:about validation
		for elem in itertools.chain(
			root.iterfind('{http://www.w3.org/2002/07/owl#}ObjectProperty'),
			root.iterfind('{http://www.w3.org/2002/07/owl#}DatatypeProperty')
			):
			
			entityRdfAbout = elem.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about')
			
			if entityRdfAbout is not None and entityRdfAbout.startswith(ns):
				
				entityRdfAboutTail = entityRdfAbout.split('/')[-1].split('#')[-1]
				
				# Remove prefix up to and including the first underscore for camelCase testing
				test_string = entityRdfAboutTail.split('_', 1)[-1]
				
				if not is_camel_case(test_string):
					
					if entityRdfAbout.startswith('https://haddenindustries.com/ontology/iso'):
						
						if not is_snake_case(test_string):
							
							self.fail('Entity name "%s" does not conform to lower snake_case' % entityRdfAboutTail)
						
					else:
						
						self.fail('Entity name "%s" does not conform to lower camelCase' % entityRdfAboutTail)

if __name__ == '__main__':
	
	import argparse
	
	argumentParser = argparse.ArgumentParser()
	
	argumentParser.add_argument('file_path', type = Path)
	
	parsedArguments = argumentParser.parse_args()
	
	a = UniversalOntologyTest()
	
	a.run_on_path(parsedArguments.file_path)