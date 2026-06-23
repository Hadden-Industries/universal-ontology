<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
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

  <!-- Targeted transformation: Process owl:Class and owl:NamedIndividual elements containing dcterms:alternative -->
  <xsl:template match="owl:Class[dcterms:alternative] | owl:NamedIndividual[dcterms:alternative]">
    <xsl:copy>
      <!-- Replicate existing attributes and process child nodes, deferring trailing whitespace -->
      <xsl:apply-templates select="@* | node()[not(position() = last() and self::text() and normalize-space(.) = '')]"/>
      
      <!-- Inject dcterms:modified if it does not already exist within the element -->
      <xsl:if test="not(dcterms:modified)">
        <xsl:text>&#10;&#9;</xsl:text>
        <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2026-06-23T09:00:00Z</dcterms:modified>
      </xsl:if>
      
      <!-- Re-append trailing whitespace -->
      <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
    </xsl:copy>
  </xsl:template>

  <!-- Targeted transformation: Convert dcterms:alternative to skos:altLabel -->
  <xsl:template match="owl:Class[dcterms:alternative]/dcterms:alternative | owl:NamedIndividual[dcterms:alternative]/dcterms:alternative">
    <skos:altLabel>
      <xsl:apply-templates select="@* | node()"/>
    </skos:altLabel>
  </xsl:template>

  <!-- Targeted transformation: Overwrite the value of an existing dcterms:modified element -->
  <xsl:template match="owl:Class[dcterms:alternative]/dcterms:modified | owl:NamedIndividual[dcterms:alternative]/dcterms:modified">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:text>2026-06-23T09:00:00Z</xsl:text>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>