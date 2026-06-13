<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:dcterms="http://purl.org/dc/terms/">

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

  <!-- Targeted transformation: Extract SOURCE block from rdfs:comment into dcterms:source sibling -->
  <xsl:template match="rdfs:comment[contains(., 'SOURCE:') and contains(substring-after(., 'SOURCE:'), ']')]">
    
    <!-- Hoist variables to template scope to ensure availability for sibling generation -->
    <xsl:variable name="before-source" select="substring-before(., 'SOURCE:')"/>
    <xsl:variable name="after-source" select="substring-after(., 'SOURCE:')"/>
    
    <!-- 1. Output the modified rdfs:comment with the source block excised -->
    <xsl:copy><xsl:apply-templates select="@*"/>
      
      <!-- Algorithmic cleanup of the text preceding the source block -->
      <xsl:variable name="clean-text-before">
        <xsl:choose>
          <!-- Matches: CRLF + '[' -->
          <xsl:when test="substring($before-source, string-length($before-source) - 2) = '&#13;&#10;['">
            <xsl:value-of select="substring($before-source, 1, string-length($before-source) - 3)"/>
          </xsl:when>
          <!-- Matches: LF + '[' -->
          <xsl:when test="substring($before-source, string-length($before-source) - 1) = '&#10;['">
            <xsl:value-of select="substring($before-source, 1, string-length($before-source) - 2)"/>
          </xsl:when>
          <!-- Matches: Space + '[' -->
          <xsl:when test="substring($before-source, string-length($before-source) - 1) = ' ['">
            <xsl:value-of select="substring($before-source, 1, string-length($before-source) - 2)"/>
          </xsl:when>
          <!-- Matches: '[' exactly at the beginning or immediately following text -->
          <xsl:when test="substring($before-source, string-length($before-source)) = '['">
            <xsl:value-of select="substring($before-source, 1, string-length($before-source) - 1)"/>
          </xsl:when>
          <!-- Fallback -->
          <xsl:otherwise>
            <xsl:value-of select="$before-source"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:variable>

      <!-- The remaining text following the closing bracket -->
      <xsl:variable name="text-after-block" select="substring-after($after-source, ']')"/>
      
      <xsl:variable name="final-comment-text" select="concat($clean-text-before, $text-after-block)"/>
      
      <!-- Route the cleaned string through the entity preserver -->
      <xsl:call-template name="escape-apos">
        <xsl:with-param name="text" select="$final-comment-text"/>
      </xsl:call-template>
    </xsl:copy>
    
    <!-- 2. Formatting instruction for the new sibling -->
    <xsl:text>&#10;&#9;</xsl:text>
    
    <!-- 3. Output the new dcterms:source sibling -->
    <xsl:variable name="source-value" select="normalize-space(substring-before($after-source, ']'))"/>
    
    <!-- Inherit the language attribute securely before passing payload to the entity preserver -->
    <dcterms:source><xsl:copy-of select="@xml:lang"/>
      <xsl:call-template name="escape-apos">
        <xsl:with-param name="text" select="$source-value"/>
      </xsl:call-template>
    </dcterms:source>
    
  </xsl:template>

</xsl:stylesheet>