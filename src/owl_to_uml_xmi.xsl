<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#"
                xmlns:dcterms="http://purl.org/dc/terms/"
                xmlns:xmi="http://schema.omg.org/spec/XMI/2.1"
                xmlns:uml="http://schema.omg.org/spec/UML/2.1"
                xmlns:schema="http://schema.org/"
                exclude-result-prefixes="owl rdf rdfs skos dcterms schema">

    <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

    <!-- Key for grouping all elements that define or reference a class URI -->
    <xsl:key name="class-by-uri" 
             match="owl:Class | rdfs:subClassOf[@rdf:resource and not(contains(@rdf:resource, 'http://www.w3.org/2001/XMLSchema#'))] | rdfs:domain[@rdf:resource] | rdfs:range[@rdf:resource and not(contains(@rdf:resource, 'http://www.w3.org/2001/XMLSchema#'))] | owl:onClass[@rdf:resource]"
             use="concat(@rdf:about, @rdf:resource)"/>

    <!-- Helper template: Sanitizes a URI into a valid XML ID, using namespace prefixes where possible -->
    <xsl:template name="get-id">
        <xsl:param name="uri"/>
        <xsl:variable name="trimmed" select="normalize-space($uri)"/>
        <xsl:choose>
            <!-- universal-core -->
            <xsl:when test="starts-with($trimmed, 'https://haddenindustries.com/ontology/universal/core/')">
                <xsl:value-of select="concat('uc:', translate(substring-after($trimmed, 'https://haddenindustries.com/ontology/universal/core/'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- reference-data -->
            <xsl:when test="starts-with($trimmed, 'https://haddenindustries.com/ontology/universal/reference-data/')">
                <xsl:value-of select="concat('urd:', translate(substring-after($trimmed, 'https://haddenindustries.com/ontology/universal/reference-data/'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- extended -->
            <xsl:when test="starts-with($trimmed, 'https://haddenindustries.com/ontology/universal/extended/')">
                <xsl:value-of select="concat('ue:', translate(substring-after($trimmed, 'https://haddenindustries.com/ontology/universal/extended/'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- iso-iec 11179-3 -->
            <xsl:when test="starts-with($trimmed, 'https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/')">
                <xsl:value-of select="concat('md:', translate(substring-after($trimmed, 'https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- skos -->
            <xsl:when test="starts-with($trimmed, 'http://www.w3.org/2004/02/skos/core#')">
                <xsl:value-of select="concat('skos:', translate(substring-after($trimmed, 'http://www.w3.org/2004/02/skos/core#'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- rdfs -->
            <xsl:when test="starts-with($trimmed, 'http://www.w3.org/2000/01/rdf-schema#')">
                <xsl:value-of select="concat('rdfs:', translate(substring-after($trimmed, 'http://www.w3.org/2000/01/rdf-schema#'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- owl -->
            <xsl:when test="starts-with($trimmed, 'http://www.w3.org/2002/07/owl#')">
                <xsl:value-of select="concat('owl:', translate(substring-after($trimmed, 'http://www.w3.org/2002/07/owl#'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- time -->
            <xsl:when test="starts-with($trimmed, 'http://www.w3.org/2006/time#')">
                <xsl:value-of select="concat('time:', translate(substring-after($trimmed, 'http://www.w3.org/2006/time#'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- gregorian -->
            <xsl:when test="starts-with($trimmed, 'http://www.w3.org/ns/time/gregorian/')">
                <xsl:value-of select="concat('greg:', translate(substring-after($trimmed, 'http://www.w3.org/ns/time/gregorian/'), ':/#.', '____'))"/>
            </xsl:when>
            <!-- fallback to the original translation logic if no match -->
            <xsl:otherwise>
                <xsl:value-of select="translate($trimmed, ':/#.', '____')"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Helper template: Extracts local name from a URI -->
    <xsl:template name="get-local-name">
        <xsl:param name="uri"/>
        <xsl:choose>
            <xsl:when test="contains($uri, '#')">
                <xsl:call-template name="get-local-name">
                    <xsl:with-param name="uri" select="substring-after($uri, '#')"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="contains($uri, '/')">
                <xsl:call-template name="get-local-name">
                    <xsl:with-param name="uri" select="substring-after($uri, '/')"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$uri"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Helper template: Filters a node-set by language preference: en-GB -> en -> fallback (first element) -->
    <xsl:template name="get-preferred-lang">
        <xsl:param name="nodes"/>
        <xsl:choose>
            <xsl:when test="$nodes[@xml:lang = 'en-GB']">
                <xsl:value-of select="normalize-space($nodes[@xml:lang = 'en-GB'][1])"/>
            </xsl:when>
            <xsl:when test="$nodes[@xml:lang = 'en']">
                <xsl:value-of select="normalize-space($nodes[@xml:lang = 'en'][1])"/>
            </xsl:when>
            <xsl:when test="$nodes">
                <xsl:value-of select="normalize-space($nodes[1])"/>
            </xsl:when>
            <xsl:otherwise/>
        </xsl:choose>
    </xsl:template>

    <!-- Main entry point -->
    <xsl:template match="/rdf:RDF">
        <xsl:variable name="all-classes" select="owl:Class | //rdfs:subClassOf[@rdf:resource and not(contains(@rdf:resource, 'http://www.w3.org/2001/XMLSchema#'))] | //rdfs:domain[@rdf:resource] | //rdfs:range[@rdf:resource and not(contains(@rdf:resource, 'http://www.w3.org/2001/XMLSchema#'))] | //owl:onClass[@rdf:resource]"/>

        <xsl:variable name="ontology-title">
            <xsl:variable name="pref-title">
                <xsl:call-template name="get-preferred-lang">
                    <xsl:with-param name="nodes" select="owl:Ontology/dcterms:title | owl:Ontology/rdfs:label"/>
                </xsl:call-template>
            </xsl:variable>
            <xsl:choose>
                <xsl:when test="normalize-space($pref-title) != ''">
                    <xsl:value-of select="$pref-title"/>
                </xsl:when>
                <xsl:otherwise>UniversalOntologyModel</xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <xmi:XMI xmi:version="2.1"
                 xmlns:xmi="http://schema.omg.org/spec/XMI/2.1"
                 xmlns:uml="http://schema.omg.org/spec/UML/2.1">
            
            <xsl:variable name="ont-uuid-uri" select="owl:Ontology/dcterms:identifier[starts-with(@rdf:resource, 'urn:uuid:')]/@rdf:resource"/>
            <xsl:variable name="ont-uuid">
                <xsl:choose>
                    <xsl:when test="$ont-uuid-uri">
                        <xsl:value-of select="substring-after($ont-uuid-uri, 'urn:uuid:')"/>
                    </xsl:when>
                    <xsl:when test="starts-with(owl:Ontology/dcterms:identifier, 'urn:uuid:')">
                        <xsl:value-of select="substring-after(owl:Ontology/dcterms:identifier, 'urn:uuid:')"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="normalize-space(owl:Ontology/dcterms:identifier)"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:variable>

            <uml:Model xmi:type="uml:Model" xmi:id="model" name="{$ontology-title}">
                <xsl:if test="normalize-space($ont-uuid) != ''">
                    <xsl:attribute name="xmi:uuid">
                        <xsl:value-of select="$ont-uuid"/>
                    </xsl:attribute>
                </xsl:if>

                <xsl:variable name="part1" select="normalize-space(owl:Ontology/dcterms:description)"/>
                <xsl:variable name="part2">
                    <xsl:variable name="ver-info" select="normalize-space(owl:Ontology/owl:versionInfo)"/>
                    <xsl:if test="$ver-info != ''">
                        <xsl:text>Version: </xsl:text>
                        <xsl:value-of select="$ver-info"/>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="part3">
                    <xsl:variable name="ver-iri" select="normalize-space(owl:Ontology/owl:versionIRI/@rdf:resource)"/>
                    <xsl:if test="$ver-iri != ''">
                        <xsl:text>Version IRI: </xsl:text>
                        <xsl:value-of select="$ver-iri"/>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="part4">
                    <xsl:variable name="created-date" select="normalize-space(owl:Ontology/dcterms:created)"/>
                    <xsl:if test="$created-date != ''">
                        <xsl:text>Created: </xsl:text>
                        <xsl:value-of select="$created-date"/>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="part5">
                    <xsl:variable name="modified-date" select="normalize-space(owl:Ontology/dcterms:modified)"/>
                    <xsl:if test="$modified-date != ''">
                        <xsl:text>Modified: </xsl:text>
                        <xsl:value-of select="$modified-date"/>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="part6">
                    <xsl:variable name="pub-val">
                        <xsl:choose>
                            <xsl:when test="owl:Ontology/dcterms:publisher/@rdf:resource">
                                <xsl:value-of select="owl:Ontology/dcterms:publisher/@rdf:resource"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:value-of select="normalize-space(owl:Ontology/dcterms:publisher)"/>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:variable>
                    <xsl:if test="normalize-space($pub-val) != ''">
                        <xsl:text>Publisher: </xsl:text>
                        <xsl:value-of select="normalize-space($pub-val)"/>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="part7">
                    <xsl:variable name="rights-val">
                        <xsl:choose>
                            <xsl:when test="owl:Ontology/dcterms:rights/@rdf:resource">
                                <xsl:value-of select="owl:Ontology/dcterms:rights/@rdf:resource"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:value-of select="normalize-space(owl:Ontology/dcterms:rights)"/>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:variable>
                    <xsl:if test="normalize-space($rights-val) != ''">
                        <xsl:text>Rights: </xsl:text>
                        <xsl:value-of select="normalize-space($rights-val)"/>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="part8">
                    <xsl:variable name="license-val">
                        <xsl:choose>
                            <xsl:when test="owl:Ontology/dcterms:license/@rdf:resource">
                                <xsl:value-of select="owl:Ontology/dcterms:license/@rdf:resource"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:value-of select="normalize-space(owl:Ontology/dcterms:license)"/>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:variable>
                    <xsl:if test="normalize-space($license-val) != ''">
                        <xsl:text>License: </xsl:text>
                        <xsl:value-of select="normalize-space($license-val)"/>
                    </xsl:if>
                </xsl:variable>

                <xsl:variable name="combined-model-desc">
                    <xsl:value-of select="$part1"/>
                    <xsl:if test="normalize-space($part1) != '' and normalize-space($part2) != ''"><xsl:text>&#10;</xsl:text></xsl:if>
                    <xsl:value-of select="$part2"/>
                    <xsl:if test="(normalize-space($part1) != '' or normalize-space($part2) != '') and normalize-space($part3) != ''"><xsl:text>&#10;</xsl:text></xsl:if>
                    <xsl:value-of select="$part3"/>
                    <xsl:if test="(normalize-space($part1) != '' or normalize-space($part2) != '' or normalize-space($part3) != '') and normalize-space($part4) != ''"><xsl:text>&#10;</xsl:text></xsl:if>
                    <xsl:value-of select="$part4"/>
                    <xsl:if test="(normalize-space($part1) != '' or normalize-space($part2) != '' or normalize-space($part3) != '' or normalize-space($part4) != '') and normalize-space($part5) != ''"><xsl:text>&#10;</xsl:text></xsl:if>
                    <xsl:value-of select="$part5"/>
                    <xsl:if test="(normalize-space($part1) != '' or normalize-space($part2) != '' or normalize-space($part3) != '' or normalize-space($part4) != '' or normalize-space($part5) != '') and normalize-space($part6) != ''"><xsl:text>&#10;</xsl:text></xsl:if>
                    <xsl:value-of select="$part6"/>
                    <xsl:if test="(normalize-space($part1) != '' or normalize-space($part2) != '' or normalize-space($part3) != '' or normalize-space($part4) != '' or normalize-space($part5) != '' or normalize-space($part6) != '') and normalize-space($part7) != ''"><xsl:text>&#10;</xsl:text></xsl:if>
                    <xsl:value-of select="$part7"/>
                    <xsl:if test="(normalize-space($part1) != '' or normalize-space($part2) != '' or normalize-space($part3) != '' or normalize-space($part4) != '' or normalize-space($part5) != '' or normalize-space($part6) != '' or normalize-space($part7) != '') and normalize-space($part8) != ''"><xsl:text>&#10;</xsl:text></xsl:if>
                    <xsl:value-of select="$part8"/>
                </xsl:variable>

                <xsl:if test="normalize-space($combined-model-desc) != ''">
                    <ownedComment xmi:type="uml:Comment" xmi:id="comment_model">
                        <body><xsl:value-of select="$combined-model-desc"/></body>
                    </ownedComment>
                </xsl:if>
                
                <!-- Primitive Types Declarations -->
                <packagedElement xmi:type="uml:PrimitiveType" xmi:id="prim_String" name="String"/>
                <packagedElement xmi:type="uml:PrimitiveType" xmi:id="prim_Integer" name="Integer"/>
                <packagedElement xmi:type="uml:PrimitiveType" xmi:id="prim_Decimal" name="Decimal"/>
                <packagedElement xmi:type="uml:PrimitiveType" xmi:id="prim_Boolean" name="Boolean"/>
                <packagedElement xmi:type="uml:PrimitiveType" xmi:id="prim_DateTime" name="DateTime"/>


                <xsl:for-each select="$all-classes[generate-id() = generate-id(key('class-by-uri', concat(@rdf:about, @rdf:resource))[1])]">
                    <xsl:variable name="class-uri" select="concat(@rdf:about, @rdf:resource)"/>
                    <xsl:if test="normalize-space($class-uri) != ''">
                        <xsl:variable name="def-node" select="//owl:Class[@rdf:about = $class-uri]"/>
                        
                        <xsl:variable name="class-id">
                            <xsl:call-template name="get-id">
                                <xsl:with-param name="uri" select="$class-uri"/>
                            </xsl:call-template>
                        </xsl:variable>

                        <!-- Preferred Name selection -->
                        <xsl:variable name="class-name">
                            <xsl:variable name="pref-name">
                                <xsl:call-template name="get-preferred-lang">
                                    <xsl:with-param name="nodes" select="$def-node/skos:prefLabel | $def-node/rdfs:label"/>
                                </xsl:call-template>
                            </xsl:variable>
                            <xsl:choose>
                                <xsl:when test="normalize-space($pref-name) != ''">
                                    <xsl:value-of select="$pref-name"/>
                                </xsl:when>
                                <xsl:otherwise>
                                    <xsl:call-template name="get-local-name">
                                        <xsl:with-param name="uri" select="$class-uri"/>
                                    </xsl:call-template>
                                </xsl:otherwise>
                            </xsl:choose>
                        </xsl:variable>

                        <!-- UUID selection -->
                        <xsl:variable name="uuid-uri" select="$def-node/dcterms:identifier[starts-with(@rdf:resource, 'urn:uuid:')]/@rdf:resource"/>
                        <xsl:variable name="uuid">
                            <xsl:if test="$uuid-uri">
                                <xsl:value-of select="substring-after($uuid-uri, 'urn:uuid:')"/>
                            </xsl:if>
                        </xsl:variable>

                        <packagedElement xmi:type="uml:Class" xmi:id="{$class-id}" name="{$class-name}">
                            <xsl:if test="normalize-space($uuid) != ''">
                                <xsl:attribute name="xmi:uuid">
                                    <xsl:value-of select="$uuid"/>
                                </xsl:attribute>
                            </xsl:if>

                            <!-- Generalization / Superclass mapping -->
                            <xsl:for-each select="$def-node/rdfs:subClassOf[@rdf:resource and not(contains(@rdf:resource, 'http://www.w3.org/2001/XMLSchema#'))]">
                                <xsl:variable name="super-uri" select="@rdf:resource"/>
                                <xsl:variable name="super-id">
                                    <xsl:call-template name="get-id">
                                        <xsl:with-param name="uri" select="$super-uri"/>
                                    </xsl:call-template>
                                </xsl:variable>
                                <xsl:variable name="gen-id" select="concat('gen_', $class-id, '_', $super-id)"/>
                                <generalization xmi:type="uml:Generalization" xmi:id="{$gen-id}" general="{$super-id}"/>
                            </xsl:for-each>

                            <!-- Descriptions, synonyms, scope notes, examples, and sources as Comment elements -->
                            <xsl:variable name="final-desc">
                                <xsl:call-template name="generate-comment-body">
                                    <xsl:with-param name="entity-uri" select="$class-uri"/>
                                    <xsl:with-param name="def-node" select="$def-node"/>
                                    <xsl:with-param name="uuid" select="$uuid"/>
                                </xsl:call-template>
                            </xsl:variable>

                            <xsl:if test="normalize-space($final-desc) != ''">
                                <ownedComment xmi:type="uml:Comment" xmi:id="comment_{$class-id}">
                                    <body><xsl:value-of select="$final-desc"/></body>
                                </ownedComment>
                            </xsl:if>

                            <!-- Datatype Properties (Attributes) -->
                            <xsl:for-each select="//owl:DatatypeProperty[rdfs:domain/@rdf:resource = $class-uri]">
                                <xsl:variable name="prop-uri" select="@rdf:about"/>
                                <xsl:variable name="prop-id">
                                    <xsl:call-template name="get-id">
                                        <xsl:with-param name="uri" select="$prop-uri"/>
                                    </xsl:call-template>
                                </xsl:variable>

                                <xsl:variable name="prop-name">
                                    <xsl:variable name="pref-prop-name">
                                        <xsl:call-template name="get-preferred-lang">
                                            <xsl:with-param name="nodes" select="skos:prefLabel | rdfs:label"/>
                                        </xsl:call-template>
                                    </xsl:variable>
                                    <xsl:choose>
                                        <xsl:when test="normalize-space($pref-prop-name) != ''">
                                            <xsl:value-of select="$pref-prop-name"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:call-template name="get-local-name">
                                                <xsl:with-param name="uri" select="$prop-uri"/>
                                            </xsl:call-template>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </xsl:variable>

                                <xsl:variable name="prop-uuid-uri" select="dcterms:identifier[starts-with(@rdf:resource, 'urn:uuid:')]/@rdf:resource"/>
                                <xsl:variable name="prop-uuid">
                                    <xsl:if test="$prop-uuid-uri">
                                        <xsl:value-of select="substring-after($prop-uuid-uri, 'urn:uuid:')"/>
                                    </xsl:if>
                                </xsl:variable>

                                <xsl:variable name="range-uri" select="rdfs:range/@rdf:resource"/>
                                <xsl:variable name="type-id">
                                    <xsl:choose>
                                        <xsl:when test="contains($range-uri, '#decimal')">prim_Decimal</xsl:when>
                                        <xsl:when test="contains($range-uri, '#integer')">prim_Integer</xsl:when>
                                        <xsl:when test="contains($range-uri, '#int')">prim_Integer</xsl:when>
                                        <xsl:when test="contains($range-uri, '#boolean')">prim_Boolean</xsl:when>
                                        <xsl:when test="contains($range-uri, '#dateTime')">prim_DateTime</xsl:when>
                                        <xsl:when test="contains($range-uri, '#date')">prim_DateTime</xsl:when>
                                        <xsl:otherwise>prim_String</xsl:otherwise>
                                    </xsl:choose>
                                </xsl:variable>

                                <ownedAttribute xmi:type="uml:Property" xmi:id="{$prop-id}" name="{$prop-name}" visibility="public" type="{$type-id}">
                                    <xsl:if test="normalize-space($prop-uuid) != ''">
                                        <xsl:attribute name="xmi:uuid">
                                            <xsl:value-of select="$prop-uuid"/>
                                        </xsl:attribute>
                                    </xsl:if>

                                    <!-- Descriptions, synonyms, scope notes, examples, and sources as Comment elements -->
                                    <xsl:variable name="final-prop-desc">
                                        <xsl:call-template name="generate-comment-body">
                                            <xsl:with-param name="entity-uri" select="$prop-uri"/>
                                            <xsl:with-param name="def-node" select="."/>
                                            <xsl:with-param name="uuid" select="$prop-uuid"/>
                                        </xsl:call-template>
                                    </xsl:variable>

                                    <xsl:if test="normalize-space($final-prop-desc) != ''">
                                        <ownedComment xmi:type="uml:Comment" xmi:id="comment_{$prop-id}">
                                            <body><xsl:value-of select="$final-prop-desc"/></body>
                                        </ownedComment>
                                    </xsl:if>

                                    <!-- Cardinality from restrictions -->
                                    <xsl:variable name="restriction" select="$def-node/rdfs:subClassOf/owl:Restriction[owl:onProperty/@rdf:resource = $prop-uri]"/>
                                    <xsl:variable name="min-card">
                                        <xsl:choose>
                                            <xsl:when test="$restriction/owl:minQualifiedCardinality"><xsl:value-of select="normalize-space($restriction/owl:minQualifiedCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:minCardinality"><xsl:value-of select="normalize-space($restriction/owl:minCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:qualifiedCardinality"><xsl:value-of select="normalize-space($restriction/owl:qualifiedCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:cardinality"><xsl:value-of select="normalize-space($restriction/owl:cardinality)"/></xsl:when>
                                            <xsl:otherwise>0</xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>
                                    <xsl:variable name="max-card">
                                        <xsl:choose>
                                            <xsl:when test="$restriction/owl:maxQualifiedCardinality"><xsl:value-of select="normalize-space($restriction/owl:maxQualifiedCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:maxCardinality"><xsl:value-of select="normalize-space($restriction/owl:maxCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:qualifiedCardinality"><xsl:value-of select="normalize-space($restriction/owl:qualifiedCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:cardinality"><xsl:value-of select="normalize-space($restriction/owl:cardinality)"/></xsl:when>
                                            <xsl:otherwise>1</xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>

                                    <lowerValue xmi:type="uml:LiteralInteger" xmi:id="lower_{$prop-id}" value="{$min-card}"/>
                                    <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="upper_{$prop-id}" value="{$max-card}"/>
                                </ownedAttribute>
                            </xsl:for-each>

                            <!-- Object Properties (Associations Ends) -->
                            <xsl:for-each select="//owl:ObjectProperty[rdfs:domain/@rdf:resource = $class-uri]">
                                <xsl:variable name="prop-uri" select="@rdf:about"/>
                                <xsl:variable name="prop-id">
                                    <xsl:call-template name="get-id">
                                        <xsl:with-param name="uri" select="$prop-uri"/>
                                    </xsl:call-template>
                                </xsl:variable>

                                <xsl:variable name="prop-name">
                                    <xsl:variable name="pref-prop-name">
                                        <xsl:call-template name="get-preferred-lang">
                                            <xsl:with-param name="nodes" select="skos:prefLabel | rdfs:label"/>
                                        </xsl:call-template>
                                    </xsl:variable>
                                    <xsl:choose>
                                        <xsl:when test="normalize-space($pref-prop-name) != ''">
                                            <xsl:value-of select="$pref-prop-name"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:call-template name="get-local-name">
                                                <xsl:with-param name="uri" select="$prop-uri"/>
                                            </xsl:call-template>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </xsl:variable>

                                <xsl:variable name="prop-uuid-uri" select="dcterms:identifier[starts-with(@rdf:resource, 'urn:uuid:')]/@rdf:resource"/>
                                <xsl:variable name="prop-uuid">
                                    <xsl:if test="$prop-uuid-uri">
                                        <xsl:value-of select="substring-after($prop-uuid-uri, 'urn:uuid:')"/>
                                    </xsl:if>
                                </xsl:variable>

                                <xsl:variable name="range-uri" select="rdfs:range/@rdf:resource"/>
                                <xsl:variable name="range-id">
                                    <xsl:call-template name="get-id">
                                        <xsl:with-param name="uri" select="$range-uri"/>
                                    </xsl:call-template>
                                </xsl:variable>
                                <xsl:variable name="assoc-id" select="concat('assoc_', $prop-id)"/>

                                <ownedAttribute xmi:type="uml:Property" xmi:id="{$prop-id}" name="{$prop-name}" visibility="public" type="{$range-id}" association="{$assoc-id}">
                                    <xsl:if test="normalize-space($prop-uuid) != ''">
                                        <xsl:attribute name="xmi:uuid">
                                            <xsl:value-of select="$prop-uuid"/>
                                        </xsl:attribute>
                                    </xsl:if>

                                    <!-- Descriptions, synonyms, scope notes, examples, and sources as Comment elements -->
                                    <xsl:variable name="final-prop-desc">
                                        <xsl:call-template name="generate-comment-body">
                                            <xsl:with-param name="entity-uri" select="$prop-uri"/>
                                            <xsl:with-param name="def-node" select="."/>
                                            <xsl:with-param name="uuid" select="$prop-uuid"/>
                                        </xsl:call-template>
                                    </xsl:variable>

                                    <xsl:if test="normalize-space($final-prop-desc) != ''">
                                        <ownedComment xmi:type="uml:Comment" xmi:id="comment_{$prop-id}">
                                            <body><xsl:value-of select="$final-prop-desc"/></body>
                                        </ownedComment>
                                    </xsl:if>

                                    <!-- Cardinality from restrictions -->
                                    <xsl:variable name="restriction" select="$def-node/rdfs:subClassOf/owl:Restriction[owl:onProperty/@rdf:resource = $prop-uri]"/>
                                    <xsl:variable name="min-card">
                                        <xsl:choose>
                                            <xsl:when test="$restriction/owl:minQualifiedCardinality"><xsl:value-of select="normalize-space($restriction/owl:minQualifiedCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:minCardinality"><xsl:value-of select="normalize-space($restriction/owl:minCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:qualifiedCardinality"><xsl:value-of select="normalize-space($restriction/owl:qualifiedCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:cardinality"><xsl:value-of select="normalize-space($restriction/owl:cardinality)"/></xsl:when>
                                            <xsl:otherwise>0</xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>
                                    <xsl:variable name="max-card">
                                        <xsl:choose>
                                            <xsl:when test="$restriction/owl:maxQualifiedCardinality"><xsl:value-of select="normalize-space($restriction/owl:maxQualifiedCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:maxCardinality"><xsl:value-of select="normalize-space($restriction/owl:maxCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:qualifiedCardinality"><xsl:value-of select="normalize-space($restriction/owl:qualifiedCardinality)"/></xsl:when>
                                            <xsl:when test="$restriction/owl:cardinality"><xsl:value-of select="normalize-space($restriction/owl:cardinality)"/></xsl:when>
                                            <xsl:otherwise>*</xsl:otherwise>
                                        </xsl:choose>
                                    </xsl:variable>

                                    <lowerValue xmi:type="uml:LiteralInteger" xmi:id="lower_{$prop-id}" value="{$min-card}"/>
                                    <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="upper_{$prop-id}" value="{$max-card}"/>
                                </ownedAttribute>
                            </xsl:for-each>
                        </packagedElement>
                    </xsl:if>
                </xsl:for-each>

                <!-- Generate Associations -->
                <xsl:for-each select="owl:ObjectProperty[rdfs:domain/@rdf:resource and rdfs:range/@rdf:resource]">
                    <xsl:variable name="prop-uri" select="@rdf:about"/>
                    <xsl:variable name="prop-id">
                        <xsl:call-template name="get-id">
                            <xsl:with-param name="uri" select="$prop-uri"/>
                        </xsl:call-template>
                    </xsl:variable>

                    <xsl:variable name="prop-name">
                        <xsl:variable name="pref-prop-name">
                            <xsl:call-template name="get-preferred-lang">
                                <xsl:with-param name="nodes" select="skos:prefLabel | rdfs:label"/>
                            </xsl:call-template>
                        </xsl:variable>
                        <xsl:choose>
                            <xsl:when test="normalize-space($pref-prop-name) != ''">
                                <xsl:value-of select="$pref-prop-name"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:call-template name="get-local-name">
                                    <xsl:with-param name="uri" select="$prop-uri"/>
                                </xsl:call-template>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:variable>

                    <xsl:variable name="prop-uuid-uri" select="dcterms:identifier[starts-with(@rdf:resource, 'urn:uuid:')]/@rdf:resource"/>
                    <xsl:variable name="prop-uuid">
                        <xsl:if test="$prop-uuid-uri">
                            <xsl:value-of select="substring-after($prop-uuid-uri, 'urn:uuid:')"/>
                        </xsl:if>
                    </xsl:variable>

                    <xsl:variable name="domain-uri" select="rdfs:domain/@rdf:resource"/>
                    <xsl:variable name="domain-id">
                        <xsl:call-template name="get-id">
                            <xsl:with-param name="uri" select="$domain-uri"/>
                        </xsl:call-template>
                    </xsl:variable>

                    <xsl:variable name="assoc-id" select="concat('assoc_', $prop-id)"/>
                    <xsl:variable name="src-end-id" select="concat('src_', $prop-id)"/>

                    <packagedElement xmi:type="uml:Association" xmi:id="{$assoc-id}" name="{$prop-name}">
                        <xsl:if test="normalize-space($prop-uuid) != ''">
                            <xsl:attribute name="xmi:uuid">
                                <xsl:value-of select="$prop-uuid"/>
                            </xsl:attribute>
                        </xsl:if>

                        <memberEnd xmi:idref="{$prop-id}"/>
                        <memberEnd xmi:idref="{$src-end-id}"/>
                        
                        <!-- Source End owned by the association -->
                                        <ownedEnd xmi:type="uml:Property" xmi:id="{$src-end-id}" name="src_{$prop-name}" type="{$domain-id}" association="{$assoc-id}" visibility="public">
                            <lowerValue xmi:type="uml:LiteralInteger" xmi:id="lower_{$src-end-id}" value="0"/>
                            <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="upper_{$src-end-id}" value="*"/>
                        </ownedEnd>
                    </packagedElement>
                </xsl:for-each>
            </uml:Model>

            <!-- Sparx Enterprise Architect Tool Specific Metadata Extensions for Entity-level UDPs -->
            <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
                <elements>
                    <xsl:for-each select="$all-classes[generate-id() = generate-id(key('class-by-uri', concat(@rdf:about, @rdf:resource))[1])]">
                        <xsl:variable name="class-uri" select="concat(@rdf:about, @rdf:resource)"/>
                        <xsl:variable name="def-node" select="//owl:Class[@rdf:about = $class-uri]"/>
                        <xsl:variable name="uuid-uri" select="$def-node/dcterms:identifier[starts-with(@rdf:resource, 'urn:uuid:')]/@rdf:resource"/>
                        <xsl:if test="normalize-space($uuid-uri) != ''">
                            <xsl:variable name="class-id">
                                <xsl:call-template name="get-id">
                                    <xsl:with-param name="uri" select="$class-uri"/>
                                </xsl:call-template>
                            </xsl:variable>
                            <xsl:variable name="uuid" select="substring-after($uuid-uri, 'urn:uuid:')"/>
                            
                            <element xmi:idref="{$class-id}" xmi:type="uml:Class" sType="Class">
                                <properties sType="Class"/>
                                <tags>
                                    <tag name="UUID" value="{$uuid}"/>
                                </tags>
                            </element>
                        </xsl:if>
                    </xsl:for-each>
                </elements>
            </xmi:Extension>
        </xmi:XMI>
    </xsl:template>

    <!-- Helper template: Generates ISO-compliant comment body from definition, scopeNotes, examples, and sources -->
    <xsl:template name="generate-comment-body">
        <xsl:param name="entity-uri"/>
        <xsl:param name="def-node"/>
        <xsl:param name="uuid"/>

        <!-- 1. Definition (skos:definition with EN sub-tag priority) -->
        <xsl:variable name="desc">
            <xsl:choose>
                <xsl:when test="$def-node/skos:definition[translate(@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'en-gb']">
                    <xsl:value-of select="$def-node/skos:definition[translate(@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'en-gb'][1]"/>
                </xsl:when>
                <xsl:when test="$def-node/skos:definition[translate(@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'en']">
                    <xsl:value-of select="$def-node/skos:definition[translate(@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'en'][1]"/>
                </xsl:when>
                <xsl:when test="$def-node/skos:definition[starts-with(translate(@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'en')]">
                    <xsl:value-of select="$def-node/skos:definition[starts-with(translate(@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'en')][1]"/>
                </xsl:when>
                <xsl:when test="$def-node/skos:definition[not(@xml:lang)]">
                    <xsl:value-of select="$def-node/skos:definition[not(@xml:lang)][1]"/>
                </xsl:when>
            </xsl:choose>
        </xsl:variable>

        <!-- 2. Scope Notes (skos:scopeNote with owl:Axiom/schema:position sorting) -->
        <xsl:variable name="scope-nodes" select="$def-node/skos:scopeNote[starts-with(translate(@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'en') or not(@xml:lang)]"/>
        <xsl:variable name="matching-axioms" select="/rdf:RDF/owl:Axiom[owl:annotatedSource/@rdf:resource = $entity-uri][owl:annotatedProperty/@rdf:resource = 'http://www.w3.org/2004/02/skos/core#scopeNote'][starts-with(translate(owl:annotatedTarget/@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'en') or not(owl:annotatedTarget/@xml:lang)]"/>

        <xsl:variable name="scope-text">
            <xsl:choose>
                <xsl:when test="count($matching-axioms) &gt; 0">
                    <xsl:for-each select="$matching-axioms">
                        <xsl:sort select="schema:position" data-type="number" order="ascending"/>
                        <xsl:text>Note </xsl:text>
                        <xsl:value-of select="position()"/>
                        <xsl:text> to entry: </xsl:text>
                        <xsl:value-of select="normalize-space(owl:annotatedTarget)"/>
                        <xsl:if test="position() != last()"><xsl:text>&#10;</xsl:text></xsl:if>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:for-each select="$scope-nodes">
                        <xsl:text>Note </xsl:text>
                        <xsl:value-of select="position()"/>
                        <xsl:text> to entry: </xsl:text>
                        <xsl:value-of select="normalize-space(.)"/>
                        <xsl:if test="position() != last()"><xsl:text>&#10;</xsl:text></xsl:if>
                    </xsl:for-each>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <!-- 3. Examples (skos:example with owl:Axiom/schema:position sorting) -->
        <xsl:variable name="example-nodes" select="$def-node/skos:example[starts-with(translate(@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'en') or not(@xml:lang)]"/>
        <xsl:variable name="example-axioms" select="/rdf:RDF/owl:Axiom[owl:annotatedSource/@rdf:resource = $entity-uri][owl:annotatedProperty/@rdf:resource = 'http://www.w3.org/2004/02/skos/core#example'][starts-with(translate(owl:annotatedTarget/@xml:lang, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'en') or not(owl:annotatedTarget/@xml:lang)]"/>

        <xsl:variable name="example-text">
            <xsl:choose>
                <xsl:when test="count($example-axioms) &gt; 0">
                    <xsl:for-each select="$example-axioms">
                        <xsl:sort select="schema:position" data-type="number" order="ascending"/>
                        <xsl:text>EXAMPLE </xsl:text>
                        <xsl:value-of select="schema:position"/>
                        <xsl:text>:&#10;</xsl:text>
                        <xsl:value-of select="normalize-space(owl:annotatedTarget)"/>
                        <xsl:if test="position() != last()"><xsl:text>&#10;</xsl:text></xsl:if>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:for-each select="$example-nodes">
                        <xsl:text>EXAMPLE </xsl:text>
                        <xsl:value-of select="position()"/>
                        <xsl:text>:&#10;</xsl:text>
                        <xsl:value-of select="normalize-space(.)"/>
                        <xsl:if test="position() != last()"><xsl:text>&#10;</xsl:text></xsl:if>
                    </xsl:for-each>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>

        <!-- 4. Source (dcterms:source) -->
        <xsl:variable name="source-text">
            <xsl:if test="$def-node/dcterms:source">
                <xsl:variable name="src-val">
                    <xsl:choose>
                        <xsl:when test="$def-node/dcterms:source/@rdf:resource">
                            <xsl:value-of select="$def-node/dcterms:source/@rdf:resource"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="normalize-space($def-node/dcterms:source)"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:if test="normalize-space($src-val) != ''">
                    <xsl:text>[SOURCE:</xsl:text>
                    <xsl:value-of select="$src-val"/>
                    <xsl:text>]</xsl:text>
                </xsl:if>
            </xsl:if>
        </xsl:variable>

        <!-- Combine elements and output with newlines between populated parts -->
        <xsl:variable name="part1" select="normalize-space($desc)"/>
        <xsl:variable name="part2" select="normalize-space($scope-text)"/>
        <xsl:variable name="part3" select="normalize-space($example-text)"/>
        <xsl:variable name="part4" select="normalize-space($source-text)"/>
        <xsl:variable name="part5" select="normalize-space($uuid)"/>

        <xsl:value-of select="$part1"/>
        <xsl:if test="normalize-space($part1) != '' and normalize-space($scope-text) != ''">
            <xsl:text>&#10;</xsl:text>
        </xsl:if>
        <xsl:value-of select="$scope-text"/>
        <xsl:if test="(normalize-space($part1) != '' or normalize-space($scope-text) != '') and normalize-space($example-text) != ''">
            <xsl:text>&#10;</xsl:text>
        </xsl:if>
        <xsl:value-of select="$example-text"/>
        <xsl:if test="(normalize-space($part1) != '' or normalize-space($scope-text) != '' or normalize-space($example-text) != '') and normalize-space($source-text) != ''">
            <xsl:text>&#10;</xsl:text>
        </xsl:if>
        <xsl:value-of select="$source-text"/>
        <xsl:if test="(normalize-space($part1) != '' or normalize-space($scope-text) != '' or normalize-space($example-text) != '' or normalize-space($source-text) != '') and normalize-space($part5) != ''">
            <xsl:text>&#10;</xsl:text>
        </xsl:if>
        <xsl:if test="normalize-space($part5) != ''">
            <xsl:text>[UUID: </xsl:text>
            <xsl:value-of select="$part5"/>
            <xsl:text>]</xsl:text>
        </xsl:if>
    </xsl:template>

</xsl:stylesheet>
