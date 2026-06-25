<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:dcterms="http://purl.org/dc/terms/"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Identity Transform -->
  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Global interceptor to enforce serialisation of entities in text nodes -->
  <xsl:template match="text()">
    <xsl:call-template name="escape-entities">
      <xsl:with-param name="text" select="."/>
    </xsl:call-template>
  </xsl:template>

  <!-- Unified entity routing to handle both &quot; and &apos; deterministically -->
  <xsl:template name="escape-entities">
    <xsl:param name="text"/>
    <xsl:choose>
      <xsl:when test="contains($text, '&quot;')">
        <xsl:call-template name="escape-apos">
          <xsl:with-param name="text" select="substring-before($text, '&quot;')"/>
        </xsl:call-template>
        <xsl:text disable-output-escaping="yes">&amp;quot;</xsl:text>
        <xsl:call-template name="escape-entities">
          <xsl:with-param name="text" select="substring-after($text, '&quot;')"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:call-template name="escape-apos">
          <xsl:with-param name="text" select="$text"/>
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Deterministic recursion to manually escape literal single quotes -->
  <xsl:template name="escape-apos">
    <xsl:param name="text"/>
    <xsl:choose>
      <xsl:when test="contains($text, &quot;'&quot;)">
        <xsl:value-of select="substring-before($text, &quot;'&quot;)"/>
        <xsl:text disable-output-escaping="yes">&amp;apos;</xsl:text>
        <xsl:call-template name="escape-apos">
          <xsl:with-param name="text" select="substring-after($text, &quot;'&quot;)"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Targeted transformation: Conditional generation of skos:prefLabel -->
  <xsl:template match="owl:Class | owl:NamedIndividual | owl:ObjectProperty | owl:DatatypeProperty">
    <xsl:variable name="is-target" select="not(skos:prefLabel) and starts-with(@rdf:about, 'https://haddenindustries.com/ontology/') and not(self::owl:NamedIndividual and (starts-with(@rdf:about, 'https://haddenindustries.com/ontology/dataset/') or starts-with(@rdf:about, 'https://haddenindustries.com/ontology/distribution/')))"/>

    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      
      <xsl:choose>
        <!-- Execute metadata injection ONLY if element qualifies for a new skos:prefLabel -->
        <xsl:when test="$is-target">
          
          <!-- Iterate over children: overwrite dcterms:modified inline and defer trailing whitespace -->
          <xsl:for-each select="node()">
            <xsl:choose>
              <xsl:when test="position() = last() and self::text() and normalize-space(.) = ''">
                <!-- Defer -->
              </xsl:when>
              <xsl:when test="self::dcterms:modified">
                <xsl:copy>
                  <xsl:apply-templates select="@*"/>
                  <xsl:text>2026-06-25T12:00:00Z</xsl:text>
                </xsl:copy>
              </xsl:when>
              <xsl:otherwise>
                <xsl:apply-templates select="."/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
          
          <!-- Fallback Hierarchy for skos:prefLabel -->
          <xsl:choose>
            <!-- Condition 1: Inherit from first sibling rdfs:label -->
            <xsl:when test="rdfs:label">
              <xsl:text>&#10;&#9;</xsl:text>
              <skos:prefLabel>
                <xsl:apply-templates select="rdfs:label[1]/@* | rdfs:label[1]/node()"/>
              </skos:prefLabel>
            </xsl:when>
            
            <!-- Condition 2: Inherit from first sibling dcterms:title -->
            <xsl:when test="dcterms:title">
              <xsl:text>&#10;&#9;</xsl:text>
              <skos:prefLabel>
                <xsl:apply-templates select="dcterms:title[1]/@* | dcterms:title[1]/node()"/>
              </skos:prefLabel>
            </xsl:when>
            
            <!-- Condition 3: Derive from URI via dynamic casing and splitting -->
            <xsl:when test="@rdf:about">
              <xsl:variable name="raw-identifier">
                <xsl:call-template name="extract-last-path-segment">
                  <xsl:with-param name="uri" select="@rdf:about"/>
                </xsl:call-template>
              </xsl:variable>
              
              <xsl:if test="$raw-identifier != ''">
                <xsl:variable name="spaced-identifier">
                  <xsl:call-template name="split-camel-case">
                    <xsl:with-param name="text" select="translate($raw-identifier, '_', ' ')"/>
                  </xsl:call-template>
                </xsl:variable>
                
                <xsl:variable name="final-identifier">
                  <xsl:choose>
                    <xsl:when test="self::owl:Class or self::owl:NamedIndividual">
                      <xsl:variable name="first-char" select="substring($spaced-identifier, 1, 1)"/>
                      <xsl:variable name="rest-chars" select="substring($spaced-identifier, 2)"/>
                      <xsl:value-of select="concat(translate($first-char, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), $rest-chars)"/>
                    </xsl:when>
                    <xsl:otherwise>
                      <xsl:value-of select="translate($spaced-identifier, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
                    </xsl:otherwise>
                  </xsl:choose>
                </xsl:variable>
                
                <xsl:text>&#10;&#9;</xsl:text>
                <skos:prefLabel xml:lang="en">
                  <xsl:call-template name="escape-entities">
                    <xsl:with-param name="text" select="normalize-space($final-identifier)"/>
                  </xsl:call-template>
                </skos:prefLabel>
              </xsl:if>
            </xsl:when>
          </xsl:choose>
          
          <!-- Inject dcterms:modified if it did not exist previously -->
          <xsl:if test="not(dcterms:modified)">
            <xsl:text>&#10;&#9;</xsl:text>
            <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2026-06-25T12:00:00Z</dcterms:modified>
          </xsl:if>
          
          <!-- Re-append trailing whitespace -->
          <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
        </xsl:when>
        
        <xsl:otherwise>
          <!-- Identity pass-through for elements that do not require modification -->
          <xsl:apply-templates select="node()"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:copy>
  </xsl:template>

  <!-- Deterministic recursion to extract substring following the final delimiter -->
  <xsl:template name="extract-last-path-segment">
    <xsl:param name="uri"/>
    <xsl:choose>
      <xsl:when test="contains($uri, '/')">
        <xsl:call-template name="extract-last-path-segment">
          <xsl:with-param name="uri" select="substring-after($uri, '/')"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$uri"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Deterministic recursion to split CamelCase strings character by character -->
  <xsl:template name="split-camel-case">
    <xsl:param name="text"/>
    <xsl:if test="$text != ''">
      <xsl:variable name="first-char" select="substring($text, 1, 1)"/>
      <xsl:variable name="rest-of-text" select="substring($text, 2)"/>
      
      <xsl:value-of select="$first-char"/>
      
      <xsl:if test="$rest-of-text != ''">
        <xsl:variable name="next-char" select="substring($rest-of-text, 1, 1)"/>
        
        <!-- Inject a space boundary when transitioning from a lowercase letter to an uppercase letter -->
        <xsl:if test="contains('abcdefghijklmnopqrstuvwxyz', $first-char) and contains('ABCDEFGHIJKLMNOPQRSTUVWXYZ', $next-char)">
          <xsl:text> </xsl:text>
        </xsl:if>
        
        <xsl:call-template name="split-camel-case">
          <xsl:with-param name="text" select="$rest-of-text"/>
        </xsl:call-template>
      </xsl:if>
    </xsl:if>
  </xsl:template>

</xsl:stylesheet>