#! python
# Hadden Industries Universal Ontology Test
import itertools
import re

from pathlib import Path
from uuid import UUID
from xmlunittest import XmlTestCase

class UniversalOntologyTest(XmlTestCase):

	def run_on_path(self, file_path: Path):
		
		nsRoot = 'https://haddenindustries.com/ontology/universal/'
		
		pathStemToNS = {
			'reference-data' : nsRoot + 'reference-data/',
			'universal-core' : nsRoot + 'core/',
			'universal-extended' : nsRoot + 'extended/',
			'iso-iec11179-3' : 'http://standards.iso.org/iso-iec/11179/-3/ed-4/'
		}
		
		ns = pathStemToNS.get(file_path.stem)
		
		identifiersList = []
		labelsList = []
		
		# Everything starts with 'assertXmlDocument'
		root = self.assertXmlDocument(file_path.read_text(encoding='utf-8'))

		for elem in itertools.chain(
			root.iterfind('{http://www.w3.org/2002/07/owl#}Class'),
			root.iterfind('{http://www.w3.org/2002/07/owl#}NamedIndividual')
			):
			
			classRdfAbout = elem.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about')
			
			if classRdfAbout.startswith(ns):
				
				if ns == 'http://standards.iso.org/iso-iec/11179/-3/ed-4/':
					
					classRdfAboutTail = str.replace(classRdfAbout, ns + 'term/', '')
					
				else:
					
					classRdfAboutTail = str.replace(classRdfAbout, ns, '')
					
				try:
					# Creator
					self.assertXpathsOnlyOne(elem, ['./dc:creator'])
					
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
                    
					if classRdfAbout.startswith(nsRoot):
                    
						self.assertXpathsExist(elem, ['./rdfs:label'])
						
						hasEnglishLabel = False
						
						for label in elem.iterfind('{http://www.w3.org/2000/01/rdf-schema#}label'):
						
							if not re.sub(r'[a-zA-Z0-9]+', '', label.text) == '':
								self.fail('rdfs:label "%s" has invalid characters' % label.text)
								
							labelXmlLang = label.get('{http://www.w3.org/XML/1998/namespace}lang')
							
							if labelXmlLang is None:
								self.fail('rdfs:label does not have an xml:lang attribute: %s' % label.text)
							
							# Check all labels are unique
							if label.text in labelsList:
								
								self.fail('another element with rdfs:label "%s" already exists' % label.text)
							
							labelsList.append(label.text)
							
							if labelXmlLang == 'en':
								if not hasEnglishLabel:
									hasEnglishLabel = True
								
								if not classRdfAboutTail == label.text:
									self.fail('en rdfs:label is not the same as the rdf:about: %s' % label.text)
									
							for title in elem.iterfind('{http://purl.org/dc/terms/}title'):
								if title.get('{http://www.w3.org/XML/1998/namespace}lang') == labelXmlLang:
									if not re.sub(r'[^a-zA-Z0-9]+', '', title.text) == label.text:
										self.fail('%s dcterms:title "%s" does not correspond to the rdfs:label "%s"' % (labelXmlLang, title.text, label.text,))
										
						if not hasEnglishLabel:
							self.fail('en rdfs:label not found')
							
						self.assertXpathsUniqueValue(elem, ['./rdfs:label/@xml:lang'])
					
					# Names
					
					if classRdfAbout.startswith(nsRoot):
					
						self.assertXpathsExist(elem, ['./dcterms:title'])
						
						hasEnglishTitle = False
						
						for title in elem.iterfind('{http://purl.org/dc/terms/}title'):
						
							titleXmlLang = title.get('{http://www.w3.org/XML/1998/namespace}lang')
							
							if titleXmlLang is None:
								self.fail('dcterms:title does not have an xml:lang attribute: %s' % title.text)
								
							if titleXmlLang == 'en':
								hasEnglishTitle = True
								
						if not hasEnglishTitle:
							self.fail('English dcterms:title not found')
							
						self.assertXpathsUniqueValue(elem, ['./dcterms:title/@xml:lang'])
					
					# Descriptions
					self.assertXpathsExist(elem, ['./dcterms:description'])
					
					for description in elem.iterfind('{http://purl.org/dc/terms/}description'):
						self.assertXmlHasAttribute(description, '{http://www.w3.org/XML/1998/namespace}lang')
						
					self.assertXpathsUniqueValue(elem, ['./dcterms:description/@xml:lang'])
					
					# Alternative names
					for alternative in elem.iterfind('{http://purl.org/dc/terms/}alternative'):
						self.assertXmlHasAttribute(alternative, '{http://www.w3.org/XML/1998/namespace}lang')
					
					# Acronyms
					for acronym in elem.iterfind('{https://haddenindustries.com/ontology/universal/core/}acronym'):
						self.assertXmlHasAttribute(acronym, '{http://www.w3.org/XML/1998/namespace}lang')
						
					# Synonyms
					for synonym in elem.iterfind('{https://haddenindustries.com/ontology/universal/core/}synonym'):
						self.assertXmlHasAttribute(synonym, '{http://www.w3.org/XML/1998/namespace}lang')
                        
					# Comments					
					for comment in elem.iterfind('{http://www.w3.org/2000/01/rdf-schema#}comment'):
					
						commentXmlLang = comment.get('{http://www.w3.org/XML/1998/namespace}lang')
						
						if commentXmlLang is None:
							self.fail('rdfs:comment does not have an xml:lang attribute: %s' % comment.text)
						
					#self.assertXpathsUniqueValue(elem, ['./rdfs:comment/@xml:lang'])
					
				except:
					print(classRdfAboutTail)
					raise
				
		# Check namespace
		self.assertXmlNamespace(root, None, ns)

if __name__ == '__main__':
	
	import argparse
	
	argumentParser = argparse.ArgumentParser()
	
	argumentParser.add_argument('file_path', type = Path)
	
	parsedArguments = argumentParser.parse_args()
	
	a = UniversalOntologyTest()
	
	a.run_on_path(parsedArguments.file_path)