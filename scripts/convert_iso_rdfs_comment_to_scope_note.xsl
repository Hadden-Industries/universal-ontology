<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:dcterms="http://purl.org/dc/terms/"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Cross-reference key linking elements with specific ISO sources by their URI -->
  <xsl:key name="iso-parents" match="*[@rdf:about and dcterms:source[starts-with(@rdf:resource, 'urn:iso:std')] and rdfs:comment]" use="@rdf:about"/>

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

  <!-- Targeted transformation: Parent elements possessing matching urn:iso:std sources AND an rdfs:comment -->
  <xsl:template match="*[@rdf:about and dcterms:source[starts-with(@rdf:resource, 'urn:iso:std')] and rdfs:comment]">
    <xsl:copy>
      <!-- Replicate existing attributes and process child nodes, deferring trailing whitespace -->
      <xsl:apply-templates select="@* | node()[not(position() = last() and self::text() and normalize-space(.) = '')]"/>
      
      <!-- Inject dcterms:modified if it does not already exist within the parent element -->
      <xsl:if test="not(dcterms:modified)">
        <xsl:text>&#10;&#9;</xsl:text>
        <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2026-06-24T08:30:00Z</dcterms:modified>
      </xsl:if>
      
      <!-- Re-append trailing whitespace -->
      <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
    </xsl:copy>
  </xsl:template>

  <!-- Targeted transformation: Convert matching parent's rdfs:comment to skos:scopeNote -->
  <xsl:template match="*[@rdf:about and dcterms:source[starts-with(@rdf:resource, 'urn:iso:std')] and rdfs:comment]/rdfs:comment">
    <skos:scopeNote>
      <xsl:apply-templates select="@* | node()"/>
    </skos:scopeNote>
  </xsl:template>

  <!-- Targeted transformation: Overwrite matching parent's existing dcterms:modified only if an rdfs:comment exists -->
  <xsl:template match="*[@rdf:about and dcterms:source[starts-with(@rdf:resource, 'urn:iso:std')] and rdfs:comment]/dcterms:modified">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:text>2026-06-24T08:30:00Z</xsl:text>
    </xsl:copy>
  </xsl:template>

  <!-- Targeted transformation: Evaluate owl:Axiom targeting rdfs:comment properties -->
  <xsl:template match="owl:Axiom[owl:annotatedProperty/@rdf:resource = 'http://www.w3.org/2000/01/rdf-schema#comment']">
    <xsl:variable name="source-uri" select="owl:annotatedSource/@rdf:resource"/>
    <xsl:variable name="target-val" select="owl:annotatedTarget"/>
    <xsl:variable name="target-lang" select="owl:annotatedTarget/@xml:lang"/>
    <xsl:variable name="target-dt" select="owl:annotatedTarget/@rdf:datatype"/>
    
    <!-- Cross-reference check: Does the Axiom align with an ISO-parent and does its target EXACTLY match the comment payload? -->
    <xsl:variable name="is-match" select="key('iso-parents', $source-uri)/rdfs:comment[. = $target-val and (@xml:lang = $target-lang or (not(@xml:lang) and not($target-lang))) and (@rdf:datatype = $target-dt or (not(@rdf:datatype) and not($target-dt)))]"/>
    
    <xsl:choose>
      <xsl:when test="$is-match">
        <xsl:copy>
          <xsl:apply-templates select="@*"/>
          <!-- Inline update of the Axiom's interior elements while preserving its localized structure -->
          <xsl:for-each select="node()">
            <xsl:choose>
              <xsl:when test="self::owl:annotatedProperty">
                <owl:annotatedProperty rdf:resource="http://www.w3.org/2004/02/skos/core#scopeNote"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:apply-templates select="."/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
        </xsl:copy>
      </xsl:when>
      <xsl:otherwise>
        <!-- Identity transform fallback for un-matched Axioms -->
        <xsl:copy>
          <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>