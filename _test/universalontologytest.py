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
		
		# Global xml:lang attribute requirement across all entities
		for global_lang_tag in [
			'{http://purl.org/dc/terms/}description',
			'{http://purl.org/dc/terms/}title',
			'{http://www.w3.org/2000/01/rdf-schema#}label',
			'{http://www.w3.org/2000/01/rdf-schema#}comment',
			'{http://www.w3.org/2004/02/skos/core#}definition'
		]:
			for instance in root.iter(global_lang_tag):
				if instance.get('{http://www.w3.org/XML/1998/namespace}lang') is None:
					self.fail('%s is missing xml:lang attribute. Text: "%s"' % (global_lang_tag.split('}')[-1], instance.text))
		
		identifiersList = []
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
			root.iterfind('{http://www.w3.org/2002/07/owl#}NamedIndividual')
			):
			
			entityRdfAbout = elem.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about')
			
			# Check restored to prevent TypeError crashes on incomplete tags
			if entityRdfAbout is None:
				self.fail("Entity is missing 'rdf:about' attribute.")
			
			if elem.tag == '{http://www.w3.org/2002/07/owl#}NamedIndividual':
				is_dataset = False
				for rdf_type in elem.iterfind('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}type'):
					if rdf_type.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource') == 'http://www.w3.org/ns/dcat#Dataset':
						is_dataset = True
						break
				
				if is_dataset:
					has_valid_theme = False
					for theme in elem.iterfind('{http://www.w3.org/ns/dcat#}theme'):
						theme_resource = theme.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
						if theme_resource and theme_resource.strip():
							has_valid_theme = True
							break
					
					if not has_valid_theme:
						self.fail('owl:NamedIndividual Dataset "%s" is missing a dcat:theme with a non-empty rdf:resource' % entityRdfAbout)
			
			if entityRdfAbout.startswith(ns):
				
				if ns.startswith('https://haddenindustries.com/ontology/iso'):
					
					entityRdfAboutTail = str.replace(entityRdfAbout, ns + 'term/', '')
					
				else:
					
					entityRdfAboutTail = str.replace(entityRdfAbout, ns, '')
					
				if not is_pascal_case(entityRdfAboutTail):
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
						entity_type = "owl:NamedIndividual" if elem.tag == '{http://www.w3.org/2002/07/owl#}NamedIndividual' else "owl:Class"
						self.fail('%s "%s" has more than one dcterms:modified' % (entity_type, entityRdfAbout))

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
					
					# Identifiers
					self.assertXpathsExist(elem, ['./dcterms:identifier'])
					
					hasUuidIdentifier = False
					
					for identifier in elem.iterfind('{http://purl.org/dc/terms/}identifier'):
						
						identifierRdfResource = identifier.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
						
						if identifierRdfResource is not None:
							
							# Check all identifiers are unique
							if identifierRdfResource in identifiersList:
								
								self.fail('another element with dcterms:identifier "%s" already exists' % identifierRdfResource)
							
							identifiersList.append(identifierRdfResource)
							
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
						
							if not re.sub(r'[a-zA-Z0-9\-]+', '', label.text) == '':
								self.fail('rdfs:label "%s" has invalid characters' % label.text)
								
							labelXmlLang = label.get('{http://www.w3.org/XML/1998/namespace}lang')
							
							# Check all labels are unique
							if label.text in labelsList:
								
								self.fail('another element with rdfs:label "%s" already exists' % label.text)
							
							labelsList.append(label.text)
							
							if labelXmlLang.partition('-')[0] == 'en':
								if not hasEnglishLabel:
									hasEnglishLabel = True
								
								if labelXmlLang == 'en' or labelXmlLang == 'en-gb':
								
									transformed_label_text = label.text
									# According to the W3C XML specification, the local part of a QName (the part after the colon) must be a valid NCName, and cannot start with a digit
									# Semantic Web and OOP communities use the approach of spelling out the number
									if transformed_label_text and transformed_label_text[0] in '0123':
										digit_map = {'0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three'}
										transformed_label_text = digit_map[transformed_label_text[0]] + transformed_label_text[1:]
									
									if not re.sub(r'[^a-zA-Z0-9]+', '', transformed_label_text) == entityRdfAboutTail:
										self.fail('en or en-gb rdfs:label does not correspond to the rdf:about: %s' % label.text)
									
							for title in elem.iterfind('{http://purl.org/dc/terms/}title'):
								if title.get('{http://www.w3.org/XML/1998/namespace}lang') == labelXmlLang:
									if not label.text == re.sub(r'[^a-zA-Z0-9\-]+', '', title.text):
										self.fail('rdfs:label "%s" does not correspond to the %s dcterms:title "%s"' % (label.text, labelXmlLang, title.text))
										
						if not hasEnglishLabel:
							self.fail('en rdfs:label not found')
							
						self.assertXpathsUniqueValue(elem, ['./rdfs:label/@xml:lang'])
					
					# Names
					
					if entityRdfAbout.startswith('https://haddenindustries.com/ontology/universal/'):
					
						self.assertXpathsExist(elem, ['./dcterms:title'])
						
						hasEnglishTitle = False
						
						for title in elem.iterfind('{http://purl.org/dc/terms/}title'):
						
							titleXmlLang = title.get('{http://www.w3.org/XML/1998/namespace}lang')
							
							if titleXmlLang.partition('-')[0] == 'en':
								hasEnglishTitle = True
								
						if not hasEnglishTitle:
							self.fail('English dcterms:title not found')
							
						self.assertXpathsUniqueValue(elem, ['./dcterms:title/@xml:lang'])
					
					# Definitions
					self.assertXpathsExist(elem, ['./skos:definition'])
					self.assertXpathsUniqueValue(elem, ['./skos:definition/@xml:lang'])
					
					# Alternative names
					for alternative in elem.iterfind('{http://purl.org/dc/terms/}alternative'):
						self.assertXmlHasAttribute(alternative, '{http://www.w3.org/XML/1998/namespace}lang')
					
					# Acronyms
					for acronym in elem.iterfind('{https://haddenindustries.com/ontology/universal/core/}acronym'):
						self.assertXmlHasAttribute(acronym, '{http://www.w3.org/XML/1998/namespace}lang')
						
					# Synonyms
					for synonym in elem.iterfind('{https://haddenindustries.com/ontology/universal/core/}synonym'):
						self.assertXmlHasAttribute(synonym, '{http://www.w3.org/XML/1998/namespace}lang')
						
				except:
					print(entityRdfAboutTail)
					raise
					
		# Property camelCase label validation
		for elem in itertools.chain(
			root.iterfind('{http://www.w3.org/2002/07/owl#}ObjectProperty'),
			root.iterfind('{http://www.w3.org/2002/07/owl#}DatatypeProperty')
			):
			
			entityRdfAbout = elem.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about')
			
			if entityRdfAbout is not None and entityRdfAbout.startswith('https://haddenindustries.com/ontology/universal/'):
				for label in elem.iterfind('{http://www.w3.org/2000/01/rdf-schema#}label'):
					if label.text and not is_camel_case(label.text):
						self.fail('rdfs:label "%s" of property "%s" does not conform to camelCase' % (label.text, entityRdfAbout))

if __name__ == '__main__':
	
	import argparse
	
	argumentParser = argparse.ArgumentParser()
	
	argumentParser.add_argument('file_path', type = Path)
	
	parsedArguments = argumentParser.parse_args()
	
	a = UniversalOntologyTest()
	
	a.run_on_path(parsedArguments.file_path)