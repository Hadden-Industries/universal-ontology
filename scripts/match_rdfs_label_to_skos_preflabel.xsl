<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Identity Transform -->
  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Global interceptor to enforce serialization of the &apos; entity in text nodes -->
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

  <!-- Targeted transformation 1: Generate missing rdfs:label based on skos:prefLabel -->
  <xsl:template match="skos:prefLabel">
    <!-- Replicate the existing skos:prefLabel perfectly -->
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
    
    <!-- Capture the current xml:lang attribute for sibling evaluation -->
    <xsl:variable name="current-lang" select="@xml:lang"/>
    
    <!-- If no sibling rdfs:label exists with the same language tag, generate it -->
    <xsl:if test="not(../rdfs:label[@xml:lang = $current-lang])">
      <xsl:text>&#10;&#9;</xsl:text>
      <rdfs:label>
        <xsl:copy-of select="@xml:lang"/>
        <xsl:call-template name="escape-apos">
          <xsl:with-param name="text" select="."/>
        </xsl:call-template>
      </rdfs:label>
    </xsl:if>
  </xsl:template>

  <!-- Targeted transformation 2: Sync existing rdfs:label value with sibling skos:prefLabel -->
  <xsl:template match="rdfs:label">
    <xsl:copy>
      <!-- Replicate existing attributes (e.g., xml:lang) perfectly -->
      <xsl:apply-templates select="@*"/>
      
      <!-- Capture the current xml:lang attribute to use as a strict lookup key -->
      <xsl:variable name="current-lang" select="@xml:lang"/>
      
      <!-- Traverse to parent, then scan children for the matching skos:prefLabel -->
      <xsl:variable name="matched-pref" select="../skos:prefLabel[@xml:lang = $current-lang]"/>
      
      <xsl:choose>
        <!-- If a matching sibling is found, inject its text safely through the entity preserver -->
        <xsl:when test="$matched-pref">
          <xsl:call-template name="escape-apos">
            <xsl:with-param name="text" select="$matched-pref"/>
          </xsl:call-template>
        </xsl:when>
        <!-- Fallback behaviour: preserve the original text if no match exists -->
        <xsl:otherwise>
          <xsl:apply-templates select="node()"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>