<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:dcterms="http://purl.org/dc/terms/">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Identity Transform -->
  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Global interceptor to enforce serialization of entities in text nodes -->
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
        <!-- Pass the segment preceding the double quote to the apostrophe handler -->
        <xsl:call-template name="escape-apos">
          <xsl:with-param name="text" select="substring-before($text, '&quot;')"/>
        </xsl:call-template>
        
        <!-- Force the serializer to write the exact double quote entity bytes -->
        <xsl:text disable-output-escaping="yes">&amp;quot;</xsl:text>
        
        <!-- Recurse for the remainder of the text node -->
        <xsl:call-template name="escape-entities">
          <xsl:with-param name="text" select="substring-after($text, '&quot;')"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <!-- Pass the clean segment to the apostrophe handler -->
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
        <!-- Output the safe prefix segment natively -->
        <xsl:value-of select="substring-before($text, &quot;'&quot;)"/>
        
        <!-- Force the serializer to write the exact entity bytes -->
        <xsl:text disable-output-escaping="yes">&amp;apos;</xsl:text>
        
        <!-- Recurse for the remainder of the text node -->
        <xsl:call-template name="escape-apos">
          <xsl:with-param name="text" select="substring-after($text, &quot;'&quot;)"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <!-- Output remaining text securely if no further quotes are detected -->
        <xsl:value-of select="$text"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Targeted transformation: Generate missing metadata for dataset NamedIndividuals -->
  <xsl:template match="owl:NamedIndividual[starts-with(@rdf:about, 'https://haddenindustries.com/ontology/dataset/')]">
    <xsl:copy>
      <!-- Replicate existing attributes and child nodes unmodified, EXCLUDING the trailing whitespace text node -->
      <xsl:apply-templates select="@* | node()[not(position() = last() and self::text() and normalize-space(.) = '')]"/>
      
      <!-- Generate dcterms:title from existing rdfs:label if title is absent -->
      <xsl:if test="not(dcterms:title) and rdfs:label">
        <xsl:text>&#10;&#9;</xsl:text>
        <dcterms:title>
          <xsl:apply-templates select="rdfs:label[1]/@* | rdfs:label[1]/node()"/>
        </dcterms:title>
      </xsl:if>

      <!-- Generate static dcterms:description if absent -->
      <xsl:if test="not(dcterms:description)">
        <xsl:text>&#10;&#9;</xsl:text>
        <dcterms:description xml:lang="en">N/A</dcterms:description>
      </xsl:if>
      
      <!-- Re-append the trailing whitespace text node to preserve closing tag formatting -->
      <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>