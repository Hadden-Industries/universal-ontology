<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:dcterms="http://purl.org/dc/terms/"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Identity Transform (Whitespace collapsed to prevent text node preemption) -->
  <xsl:template match="@* | node()">
    <xsl:copy><xsl:apply-templates select="@* | node()"/></xsl:copy>
  </xsl:template>

  <!-- Global interceptor to enforce serialisation of the &apos; entity in text nodes -->
  <xsl:template match="text()">
    <xsl:call-template name="escape-apos">
      <xsl:with-param name="text" select="."/>
    </xsl:call-template>
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
    <xsl:copy>
      <!-- Replicate existing attributes and child nodes unmodified, EXCLUDING the trailing whitespace text node -->
      <xsl:apply-templates select="@* | node()[not(position() = last() and self::text() and normalize-space(.) = '')]"/>
      
      <!-- Guard clause: 
           1. Ensure skos:prefLabel does not already exist.
           2. Ensure rdf:about belongs to the target domain whitelist.
           3. Exclude NamedIndividuals originating from the dataset or distribution namespaces. -->
      <xsl:if test="not(skos:prefLabel) and starts-with(@rdf:about, 'https://haddenindustries.com/ontology/') and not(self::owl:NamedIndividual and (starts-with(@rdf:about, 'https://haddenindustries.com/ontology/dataset/') or starts-with(@rdf:about, 'https://haddenindustries.com/ontology/distribution/')))">
        <xsl:choose>
          
          <!-- Condition 1: Inherit from first sibling rdfs:label -->
          <xsl:when test="rdfs:label">
            <xsl:text>&#10;&#9;</xsl:text>
            <skos:prefLabel>
              <!-- Applies attributes and routes text implicitly through the global escape-apos interceptor -->
              <xsl:apply-templates select="rdfs:label[1]/@* | rdfs:label[1]/node()"/>
            </skos:prefLabel>
          </xsl:when>
          
          <!-- Condition 2: Inherit from first sibling dcterms:title -->
          <xsl:when test="dcterms:title">
            <xsl:text>&#10;&#9;</xsl:text>
            <skos:prefLabel>
              <!-- Applies attributes and routes text implicitly through the global escape-apos interceptor -->
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
              
              <!-- Translate underscores to spaces, then map CamelCase boundary transitions to spaces -->
              <xsl:variable name="spaced-identifier">
                <xsl:call-template name="split-camel-case">
                  <xsl:with-param name="text" select="translate($raw-identifier, '_', ' ')"/>
                </xsl:call-template>
              </xsl:variable>
              
              <!-- Force casing normalisation based on target element type -->
              <xsl:variable name="final-identifier">
                <xsl:choose>
                  <!-- PascalCase for Classes and Individuals (forces first character to uppercase) -->
                  <xsl:when test="self::owl:Class or self::owl:NamedIndividual">
                    <xsl:variable name="first-char" select="substring($spaced-identifier, 1, 1)"/>
                    <xsl:variable name="rest-chars" select="substring($spaced-identifier, 2)"/>
                    <xsl:value-of select="concat(translate($first-char, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), $rest-chars)"/>
                  </xsl:when>
                  <!-- Exclusively lowercase for Properties to read like a natural language predicate -->
                  <xsl:otherwise>
                    <xsl:value-of select="translate($spaced-identifier, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              
              <xsl:text>&#10;&#9;</xsl:text>
              <skos:prefLabel xml:lang="en">
                <!-- Defensive normalisation collapses potential double-spaces generated during string processing -->
                <xsl:call-template name="escape-apos">
                  <xsl:with-param name="text" select="normalize-space($final-identifier)"/>
                </xsl:call-template>
              </skos:prefLabel>
            </xsl:if>
          </xsl:when>
          
        </xsl:choose>
      </xsl:if>
      
      <!-- Re-append the trailing whitespace text node to preserve closing tag formatting -->
      <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
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