<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:dcterms="http://purl.org/dc/terms/"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Cross-reference key linking owl:Axiom elements to their target via owl:annotatedSource -->
  <xsl:key name="axiom-by-source" match="owl:Axiom[dcterms:alternative]" use="owl:annotatedSource/@rdf:resource"/>

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

  <!-- Targeted transformation: Process any element targeted by an owl:Axiom containing dcterms:alternative -->
  <xsl:template match="*[@rdf:about and key('axiom-by-source', @rdf:about)]">
    <xsl:copy>
      <!-- Replicate attributes unmodified -->
      <xsl:apply-templates select="@*"/>
      
      <!-- Iterate over child nodes to handle dcterms:modified in-place, deferring trailing whitespace -->
      <xsl:for-each select="node()">
        <xsl:choose>
          <!-- Temporarily skip the trailing formatting whitespace -->
          <xsl:when test="position() = last() and self::text() and normalize-space(.) = ''">
            <!-- Defer -->
          </xsl:when>
          <!-- Update the timestamp natively if dcterms:modified already exists -->
          <xsl:when test="self::dcterms:modified">
            <xsl:copy>
              <xsl:apply-templates select="@*"/>
              <xsl:text>2026-06-23T09:30:00Z</xsl:text>
            </xsl:copy>
          </xsl:when>
          <!-- Copy all other standard children -->
          <xsl:otherwise>
            <xsl:apply-templates select="."/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
      
      <!-- Loop through all dcterms:alternative child elements of linked owl:Axiom elements -->
      <xsl:for-each select="key('axiom-by-source', @rdf:about)/dcterms:alternative">
        <xsl:text>&#10;&#9;</xsl:text>
        <skos:altLabel>
          <xsl:apply-templates select="@* | node()"/>
        </skos:altLabel>
      </xsl:for-each>
      
      <!-- Inject dcterms:modified ONLY if it did not already exist to be updated above -->
      <xsl:if test="not(dcterms:modified)">
        <xsl:text>&#10;&#9;</xsl:text>
        <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2026-06-23T09:30:00Z</dcterms:modified>
      </xsl:if>
      
      <!-- Re-append trailing whitespace text node to preserve closing tag formatting -->
      <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
    </xsl:copy>
  </xsl:template>

  <!-- Targeted transformation: Delete the fully processed owl:Axiom elements -->
  <xsl:template match="owl:Axiom[dcterms:alternative]"/>

</xsl:stylesheet>