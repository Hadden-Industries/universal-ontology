import unittest
import os
from lxml import etree
from xmlunittest import XmlTestCase

class TestOwlToUmlXmi(XmlTestCase):
    @classmethod
    def setUpClass(cls):
        # Path to stylesheet
        cls.xslt_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            "scripts", 
            "owl_to_uml_xmi.xsl"
        )
        with open(cls.xslt_path, "r", encoding="utf-8") as f:
            xslt_doc = etree.parse(f)
            cls.xslt_transformer = etree.XSLT(xslt_doc)

    def run_transformation(self, owl_xml_str: str) -> etree._XSLTResultTree:
        owl_dom = etree.fromstring(owl_xml_str.encode('utf-8'))
        return self.xslt_transformer(owl_dom)

    def test_ontology_metadata_and_primitives(self):
        owl_xml = """<rdf:RDF xmlns="https://haddenindustries.com/ontology/test/"
             xml:base="https://haddenindustries.com/ontology/test/"
             xmlns:owl="http://www.w3.org/2002/07/owl#"
             xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
             xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
             xmlns:skos="http://www.w3.org/2004/02/skos/core#"
             xmlns:dcterms="http://purl.org/dc/terms/">
            <owl:Ontology rdf:about="https://haddenindustries.com/ontology/test/">
                <dcterms:title xml:lang="en">Test Ontology US</dcterms:title>
                <dcterms:title xml:lang="en-GB">Test Ontology GB</dcterms:title>
            </owl:Ontology>
        </rdf:RDF>"""
        
        result_tree = self.run_transformation(owl_xml)
        
        # Verify root namespaces and model name (en-GB preference)
        root = self.assertXmlDocument(bytes(result_tree))
        self.assertXpathsExist(root, [
            "/xmi:XMI[@xmi:version='2.1']",
            "/xmi:XMI/uml:Model[@name='Test Ontology GB']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:type='uml:PrimitiveType'][@xmi:id='prim_String'][@name='String']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:type='uml:PrimitiveType'][@xmi:id='prim_Decimal'][@name='Decimal']"
        ])

    def test_class_creation_and_inheritance(self):
        owl_xml = """<rdf:RDF xmlns="https://haddenindustries.com/ontology/test/"
             xml:base="https://haddenindustries.com/ontology/test/"
             xmlns:owl="http://www.w3.org/2002/07/owl#"
             xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
             xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
             xmlns:skos="http://www.w3.org/2004/02/skos/core#"
             xmlns:dcterms="http://purl.org/dc/terms/">
            
            <owl:Class rdf:about="https://haddenindustries.com/ontology/test/BaseClass">
                <skos:prefLabel xml:lang="en-GB">Base Class GB</skos:prefLabel>
                <skos:definition xml:lang="en">Base definition fallback</skos:definition>
                <dcterms:identifier rdf:resource="urn:uuid:11111111-1111-1111-1111-111111111111"/>
            </owl:Class>

            <owl:Class rdf:about="https://haddenindustries.com/ontology/test/SubClass">
                <rdfs:subClassOf rdf:resource="https://haddenindustries.com/ontology/test/BaseClass"/>
                <skos:prefLabel xml:lang="fr">Sub Class FR</skos:prefLabel>
                <skos:definition xml:lang="en">Sub Definition US</skos:definition>
                <skos:definition xml:lang="en-GB">Sub Definition GB</skos:definition>
                <dcterms:identifier rdf:resource="urn:uuid:22222222-2222-2222-2222-222222222222"/>
            </owl:Class>
        </rdf:RDF>"""

        result_tree = self.run_transformation(owl_xml)
        root = self.assertXmlDocument(bytes(result_tree))
        
        # Verify BaseClass properties (name from prefLabel, uuid, definition comment)
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model/packagedElement[@xmi:type='uml:Class'][@xmi:id='https___haddenindustries_com_ontology_test_BaseClass'][@name='Base Class GB'][@xmi:uuid='11111111-1111-1111-1111-111111111111']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass']/ownedComment/body[contains(., 'Base definition fallback')][contains(., '[UUID: 11111111-1111-1111-1111-111111111111]')]"
        ])
        
        # Verify SubClass properties (name fallback to first match 'Sub Class FR', uuid, definition comment from 'en-GB')
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model/packagedElement[@xmi:type='uml:Class'][@xmi:id='https___haddenindustries_com_ontology_test_SubClass'][@name='Sub Class FR'][@xmi:uuid='22222222-2222-2222-2222-222222222222']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_SubClass']/ownedComment/body[contains(., 'Sub Definition GB')][contains(., '[UUID: 22222222-2222-2222-2222-222222222222]')]",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_SubClass']/generalization[@general='https___haddenindustries_com_ontology_test_BaseClass']"
        ])

        # Verify Sparx Enterprise Architect xmi:Extension elements (UUID UDPs)
        self.assertXpathsExist(root, [
            "/xmi:XMI/xmi:Extension[@extender='Enterprise Architect'][@extenderID='6.5']/elements/element[@xmi:idref='https___haddenindustries_com_ontology_test_BaseClass'][@xmi:type='uml:Class'][@sType='Class']/tags/tag[@name='UUID'][@value='11111111-1111-1111-1111-111111111111']",
            "/xmi:XMI/xmi:Extension[@extender='Enterprise Architect'][@extenderID='6.5']/elements/element[@xmi:idref='https___haddenindustries_com_ontology_test_SubClass'][@xmi:type='uml:Class'][@sType='Class']/tags/tag[@name='UUID'][@value='22222222-2222-2222-2222-222222222222']"
        ])

    def test_datatype_property_and_multiplicity(self):
        owl_xml = """<rdf:RDF xmlns="https://haddenindustries.com/ontology/test/"
             xml:base="https://haddenindustries.com/ontology/test/"
             xmlns:owl="http://www.w3.org/2002/07/owl#"
             xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
             xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
             xmlns:skos="http://www.w3.org/2004/02/skos/core#"
             xmlns:dcterms="http://purl.org/dc/terms/">
            
            <owl:Class rdf:about="https://haddenindustries.com/ontology/test/BaseClass">
                <rdfs:subClassOf>
                    <owl:Restriction>
                        <owl:onProperty rdf:resource="https://haddenindustries.com/ontology/test/BaseClass_numericalVal"/>
                        <owl:minQualifiedCardinality rdf:datatype="http://www.w3.org/2001/XMLSchema#nonNegativeInteger">1</owl:minQualifiedCardinality>
                        <owl:maxQualifiedCardinality rdf:datatype="http://www.w3.org/2001/XMLSchema#nonNegativeInteger">5</owl:maxQualifiedCardinality>
                    </owl:Restriction>
                </rdfs:subClassOf>
            </owl:Class>

            <owl:DatatypeProperty rdf:about="https://haddenindustries.com/ontology/test/BaseClass_numericalVal">
                <rdfs:domain rdf:resource="https://haddenindustries.com/ontology/test/BaseClass"/>
                <rdfs:range rdf:resource="http://www.w3.org/2001/XMLSchema#decimal"/>
                <skos:prefLabel xml:lang="en-GB">Numerical Value</skos:prefLabel>
                <skos:definition xml:lang="en">Some property comment</skos:definition>
            </owl:DatatypeProperty>
        </rdf:RDF>"""

        result_tree = self.run_transformation(owl_xml)
        root = self.assertXmlDocument(bytes(result_tree))
        
        # Verify the ownedAttribute inside BaseClass has the correct type (prim_Decimal) and name, and comments, and cardinalities
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass']/ownedAttribute[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass_numericalVal'][@name='Numerical Value'][@type='prim_Decimal']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass']/ownedAttribute[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass_numericalVal']/ownedComment/body[.='Some property comment']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass']/ownedAttribute[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass_numericalVal']/lowerValue[@value='1']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass']/ownedAttribute[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass_numericalVal']/upperValue[@value='5']"
        ])

    def test_object_property_and_associations(self):
        owl_xml = """<rdf:RDF xmlns="https://haddenindustries.com/ontology/test/"
             xml:base="https://haddenindustries.com/ontology/test/"
             xmlns:owl="http://www.w3.org/2002/07/owl#"
             xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
             xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
             xmlns:skos="http://www.w3.org/2004/02/skos/core#"
             xmlns:dcterms="http://purl.org/dc/terms/">
            
            <owl:Class rdf:about="https://haddenindustries.com/ontology/test/BaseClass"/>
            <owl:Class rdf:about="https://haddenindustries.com/ontology/test/SubClass"/>

            <owl:ObjectProperty rdf:about="https://haddenindustries.com/ontology/test/SubClass_hasRelation">
                <rdfs:domain rdf:resource="https://haddenindustries.com/ontology/test/SubClass"/>
                <rdfs:range rdf:resource="https://haddenindustries.com/ontology/test/BaseClass"/>
                <skos:prefLabel xml:lang="en">has relation</skos:prefLabel>
                <dcterms:identifier rdf:resource="urn:uuid:33333333-3333-3333-3333-333333333333"/>
            </owl:ObjectProperty>
        </rdf:RDF>"""

        result_tree = self.run_transformation(owl_xml)
        root = self.assertXmlDocument(bytes(result_tree))
        
        # Verify the ownedAttribute representing association end exists in SubClass
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_SubClass']/ownedAttribute[@xmi:id='https___haddenindustries_com_ontology_test_SubClass_hasRelation'][@name='has relation'][@type='https___haddenindustries_com_ontology_test_BaseClass'][@association='assoc_https___haddenindustries_com_ontology_test_SubClass_hasRelation'][@xmi:uuid='33333333-3333-3333-3333-333333333333']"
        ])
        
            # Verify the packaging element of type Association is created at root model level with memberEnds and ownedEnd
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model/packagedElement[@xmi:type='uml:Association'][@xmi:id='assoc_https___haddenindustries_com_ontology_test_SubClass_hasRelation'][@name='has relation'][@xmi:uuid='33333333-3333-3333-3333-333333333333']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='assoc_https___haddenindustries_com_ontology_test_SubClass_hasRelation']/memberEnd[@xmi:idref='https___haddenindustries_com_ontology_test_SubClass_hasRelation']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='assoc_https___haddenindustries_com_ontology_test_SubClass_hasRelation']/memberEnd[@xmi:idref='src_https___haddenindustries_com_ontology_test_SubClass_hasRelation']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='assoc_https___haddenindustries_com_ontology_test_SubClass_hasRelation']/ownedEnd[@xmi:id='src_https___haddenindustries_com_ontology_test_SubClass_hasRelation'][@type='https___haddenindustries_com_ontology_test_SubClass'][@association='assoc_https___haddenindustries_com_ontology_test_SubClass_hasRelation']"
        ])

    def test_namespace_prefixes(self):
        owl_xml = """<rdf:RDF xmlns="https://haddenindustries.com/ontology/universal/core/"
             xml:base="https://haddenindustries.com/ontology/universal/core/"
             xmlns:owl="http://www.w3.org/2002/07/owl#"
             xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
             xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
             xmlns:skos="http://www.w3.org/2004/02/skos/core#"
             xmlns:dcterms="http://purl.org/dc/terms/">
            
            <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/core/Activity">
                <skos:prefLabel xml:lang="en">Activity</skos:prefLabel>
            </owl:Class>
            <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/reference-data/ActivityClass">
                <skos:prefLabel xml:lang="en">Activity Class</skos:prefLabel>
            </owl:Class>

            <owl:ObjectProperty rdf:about="https://haddenindustries.com/ontology/universal/core/Activity_hasActivityClass">
                <rdfs:domain rdf:resource="https://haddenindustries.com/ontology/universal/core/Activity"/>
                <rdfs:range rdf:resource="https://haddenindustries.com/ontology/universal/reference-data/ActivityClass"/>
                <skos:prefLabel xml:lang="en">has activity class</skos:prefLabel>
            </owl:ObjectProperty>
        </rdf:RDF>"""

        result_tree = self.run_transformation(owl_xml)
        root = self.assertXmlDocument(bytes(result_tree))
        
        # Verify IDs and references use prefixes:
        # - uc:Activity
        # - urd:ActivityClass
        # - uc:Activity_hasActivityClass
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model/packagedElement[@xmi:type='uml:Class'][@xmi:id='uc:Activity'][@name='Activity']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:type='uml:Class'][@xmi:id='urd:ActivityClass'][@name='Activity Class']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='uc:Activity']/ownedAttribute[@xmi:id='uc:Activity_hasActivityClass'][@name='has activity class'][@type='urd:ActivityClass'][@association='assoc_uc:Activity_hasActivityClass']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:type='uml:Association'][@xmi:id='assoc_uc:Activity_hasActivityClass'][@name='has activity class']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='assoc_uc:Activity_hasActivityClass']/memberEnd[@xmi:idref='uc:Activity_hasActivityClass']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='assoc_uc:Activity_hasActivityClass']/memberEnd[@xmi:idref='src_uc:Activity_hasActivityClass']",
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='assoc_uc:Activity_hasActivityClass']/ownedEnd[@xmi:id='src_uc:Activity_hasActivityClass'][@type='uc:Activity'][@association='assoc_uc:Activity_hasActivityClass']"
        ])

    def test_logical_model_additions(self):
        owl_xml = """<rdf:RDF xmlns="https://haddenindustries.com/ontology/test/"
             xml:base="https://haddenindustries.com/ontology/test/"
             xmlns:owl="http://www.w3.org/2002/07/owl#"
             xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
             xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
             xmlns:skos="http://www.w3.org/2004/02/skos/core#"
             xmlns:dcterms="http://purl.org/dc/terms/">
            
            <owl:Class rdf:about="https://haddenindustries.com/ontology/test/BaseClass">
                <skos:prefLabel xml:lang="en-GB">Base Class GB</skos:prefLabel>
                <skos:definition xml:lang="en-GB">Base definition</skos:definition>
                <skos:altLabel xml:lang="en-GB">Alias One</skos:altLabel>
                <skos:altLabel xml:lang="en-GB">Alias Two</skos:altLabel>
                <skos:scopeNote xml:lang="en-GB">Scope Note One</skos:scopeNote>
                <dcterms:identifier rdf:resource="urn:uuid:11111111-1111-1111-1111-111111111111"/>
            </owl:Class>

            <!-- Class that has an explicit identifier, both Identifier (UUID PK) and explicit item identifier should exist -->
            <owl:Class rdf:about="https://haddenindustries.com/ontology/test/ClassWithExplicitID"/>

            <owl:DatatypeProperty rdf:about="https://haddenindustries.com/ontology/test/ClassWithExplicitID_item_identifier">
                <rdfs:domain rdf:resource="https://haddenindustries.com/ontology/test/ClassWithExplicitID"/>
                <rdfs:range rdf:resource="http://www.w3.org/2001/XMLSchema#string"/>
                <skos:prefLabel xml:lang="en">item identifier</skos:prefLabel>
            </owl:DatatypeProperty>
        </rdf:RDF>"""

        result_tree = self.run_transformation(owl_xml)
        root = self.assertXmlDocument(bytes(result_tree))
        
        # Verify BaseClass has:
        # 1. Body comment containing definition and Scope Notes separated by newlines
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass']/ownedComment/body"
        ])
        
        # Check description text matches new ISO formatting
        namespaces = {
            'xmi': 'http://schema.omg.org/spec/XMI/2.1',
            'uml': 'http://schema.omg.org/spec/UML/2.1'
        }
        comment_body = root.xpath("/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_BaseClass']/ownedComment/body/text()", namespaces=namespaces)[0]
        self.assertEqual(comment_body.strip(), "Base definition\nNote 1 to entry: Scope Note One\n[UUID: 11111111-1111-1111-1111-111111111111]")
        
        # Verify ClassWithExplicitID has:
        # 1. Explicit item identifier attribute as regular property (without isID="true")
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model/packagedElement[@xmi:id='https___haddenindustries_com_ontology_test_ClassWithExplicitID']/ownedAttribute[@xmi:id='https___haddenindustries_com_ontology_test_ClassWithExplicitID_item_identifier'][not(@isID)]"
        ])

    def test_iso_comment_formatting(self):
        owl_xml = """<rdf:RDF xmlns="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/term/"
             xml:base="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/term/"
             xmlns:owl="http://www.w3.org/2002/07/owl#"
             xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
             xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
             xmlns:skos="http://www.w3.org/2004/02/skos/core#"
             xmlns:dcterms="http://purl.org/dc/terms/"
             xmlns:schema="http://schema.org/">
            
            <owl:Class rdf:about="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/term/Registration">
                <skos:prefLabel xml:lang="en">Registration</skos:prefLabel>
                <skos:definition xml:lang="en">representation of a concept by an expression that describes it and differentiates it from related concepts</skos:definition>
                
                <skos:scopeNote xml:lang="en">A detailed description of registration as it applies in ISO/IEC 11179 is found in ISO/IEC 11179-6</skos:scopeNote>
                <skos:scopeNote xml:lang="en">A registry item is recorded in the registry, but is not necessarily identified, named, defined, classified, registered or administered. Specific information needs to be provided for each of these categories which can be provided when the item is initially recorded, or later. See also classified item (3.2.55), identified item (3.2.61), registered item (3.2.62), administered item (3.2.66) and attached item (3.2.68).</skos:scopeNote>
                <skos:scopeNote xml:lang="en">In this document, registration requires that a minimum set of administrative information (3.2.67) about the registry item (3.2.54) be specified, such that it becomes a registered item (3.2.65)</skos:scopeNote>
                
                <skos:example xml:lang="en">Example description here</skos:example>
                
                <dcterms:source rdf:resource="urn:iso:std:iso-iec:11179:-1:ed-4:v1:term:3.3.33"/>
                <dcterms:identifier rdf:resource="urn:uuid:55555555-5555-5555-5555-555555555555"/>
            </owl:Class>
            
            <owl:Axiom>
                <owl:annotatedSource rdf:resource="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/term/Registration"/>
                <owl:annotatedProperty rdf:resource="http://www.w3.org/2004/02/skos/core#scopeNote"/>
                <owl:annotatedTarget xml:lang="en">A detailed description of registration as it applies in ISO/IEC 11179 is found in ISO/IEC 11179-6</owl:annotatedTarget>
                <schema:position rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">1</schema:position>
            </owl:Axiom>
            <owl:Axiom>
                <owl:annotatedSource rdf:resource="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/term/Registration"/>
                <owl:annotatedProperty rdf:resource="http://www.w3.org/2004/02/skos/core#scopeNote"/>
                <owl:annotatedTarget xml:lang="en">A registry item is recorded in the registry, but is not necessarily identified, named, defined, classified, registered or administered. Specific information needs to be provided for each of these categories which can be provided when the item is initially recorded, or later. See also classified item (3.2.55), identified item (3.2.61), registered item (3.2.62), administered item (3.2.66) and attached item (3.2.68).</owl:annotatedTarget>
                <schema:position rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">3</schema:position>
            </owl:Axiom>
            <owl:Axiom>
                <owl:annotatedSource rdf:resource="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/term/Registration"/>
                <owl:annotatedProperty rdf:resource="http://www.w3.org/2004/02/skos/core#scopeNote"/>
                <owl:annotatedTarget xml:lang="en">In this document, registration requires that a minimum set of administrative information (3.2.67) about the registry item (3.2.54) be specified, such that it becomes a registered item (3.2.65)</owl:annotatedTarget>
                <schema:position rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">2</schema:position>
            </owl:Axiom>
            
            <owl:Axiom>
                <owl:annotatedSource rdf:resource="https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/term/Registration"/>
                <owl:annotatedProperty rdf:resource="http://www.w3.org/2004/02/skos/core#example"/>
                <owl:annotatedTarget xml:lang="en">Example description here</owl:annotatedTarget>
                <schema:position rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">1</schema:position>
            </owl:Axiom>
        </rdf:RDF>"""

        result_tree = self.run_transformation(owl_xml)
        root = self.assertXmlDocument(bytes(result_tree))
        
        namespaces = {
            'xmi': 'http://schema.omg.org/spec/XMI/2.1',
            'uml': 'http://schema.omg.org/spec/UML/2.1'
        }
        comment_body = root.xpath("/xmi:XMI/uml:Model/packagedElement[@xmi:id='md:term_Registration']/ownedComment/body/text()", namespaces=namespaces)[0]
        
        expected_definition = "representation of a concept by an expression that describes it and differentiates it from related concepts"
        expected_notes = (
            "Note 1 to entry: A detailed description of registration as it applies in ISO/IEC 11179 is found in ISO/IEC 11179-6\n"
            "Note 2 to entry: In this document, registration requires that a minimum set of administrative information (3.2.67) about the registry item (3.2.54) be specified, such that it becomes a registered item (3.2.65)\n"
            "Note 3 to entry: A registry item is recorded in the registry, but is not necessarily identified, named, defined, classified, registered or administered. Specific information needs to be provided for each of these categories which can be provided when the item is initially recorded, or later. See also classified item (3.2.55), identified item (3.2.61), registered item (3.2.62), administered item (3.2.66) and attached item (3.2.68)."
        )
        expected_example = "EXAMPLE 1:\nExample description here"
        expected_source = "[SOURCE:urn:iso:std:iso-iec:11179:-1:ed-4:v1:term:3.3.33]"
        
        expected_combined = f"{expected_definition}\n{expected_notes}\n{expected_example}\n{expected_source}\n[UUID: 55555555-5555-5555-5555-555555555555]"
        self.assertEqual(comment_body.strip(), expected_combined)

    def test_ontology_metadata_mapping(self):
        owl_xml = """<rdf:RDF xmlns="https://haddenindustries.com/ontology/test/"
             xml:base="https://haddenindustries.com/ontology/test/"
             xmlns:owl="http://www.w3.org/2002/07/owl#"
             xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
             xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
             xmlns:dcterms="http://purl.org/dc/terms/">
            
            <owl:Ontology rdf:about="https://haddenindustries.com/ontology/test/">
                <owl:versionInfo>2026-07-07</owl:versionInfo>
                <owl:versionIRI rdf:resource="https://haddenindustries.com/ontology/test/20260707"/>
                <dcterms:created>2016-09-30</dcterms:created>
                <dcterms:modified>2026-07-07</dcterms:modified>
                <dcterms:publisher rdf:resource="https://haddenindustries.com"/>
                <dcterms:rights rdf:resource="https://haddenindustries.com/legal.html"/>
                <dcterms:license rdf:resource="https://opensource.org/licenses/MIT"/>
                <dcterms:description xml:lang="en">Test ontology description</dcterms:description>
                <dcterms:identifier rdf:resource="urn:uuid:99999999-9999-9999-9999-999999999999"/>
                <dcterms:title xml:lang="en">Test Ontology Model</dcterms:title>
            </owl:Ontology>
        </rdf:RDF>"""

        result_tree = self.run_transformation(owl_xml)
        root = self.assertXmlDocument(bytes(result_tree))
        
        namespaces = {
            'xmi': 'http://schema.omg.org/spec/XMI/2.1',
            'uml': 'http://schema.omg.org/spec/UML/2.1'
        }
        
        # Verify Model UUID mapping
        self.assertXpathsExist(root, [
            "/xmi:XMI/uml:Model[@xmi:id='model'][@name='Test Ontology Model'][@xmi:uuid='99999999-9999-9999-9999-999999999999']"
        ])
        
        # Verify Model Comment Content
        comment_body = root.xpath("/xmi:XMI/uml:Model[@xmi:id='model']/ownedComment[@xmi:id='comment_model']/body/text()", namespaces=namespaces)[0]
        self.assertIn("Test ontology description", comment_body)
        self.assertIn("Version: 2026-07-07", comment_body)
        self.assertIn("Version IRI: https://haddenindustries.com/ontology/test/20260707", comment_body)
        self.assertIn("Created: 2016-09-30", comment_body)
        self.assertIn("Modified: 2026-07-07", comment_body)
        self.assertIn("Publisher: https://haddenindustries.com", comment_body)
        self.assertIn("Rights: https://haddenindustries.com/legal.html", comment_body)
        self.assertIn("License: https://opensource.org/licenses/MIT", comment_body)

if __name__ == '__main__':
    unittest.main()
