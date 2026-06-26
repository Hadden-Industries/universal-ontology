<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:dcterms="http://purl.org/dc/terms/">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Global parameter for dynamic runtime timestamp injection -->
  <xsl:param name="current-timestamp" select="'2026-06-26T07:53:00Z'"/>

  <!-- Identity Transform -->
  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Targeted transformation: Prune any completely empty rdfs:comment elements globally -->
  <xsl:template match="rdfs:comment[normalize-space(.) = '']"/>

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

  <!-- Targeted transformation: Intercept parent elements possessing an rdfs:comment with a SOURCE block -->
  <xsl:template match="*[rdfs:comment[contains(., 'SOURCE:') and contains(substring-after(., 'SOURCE:'), ']')]]">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      
      <!-- Iterate over children inline to mutate comments, extract sources, and merge modification timestamps securely -->
      <xsl:for-each select="node()">
        <xsl:choose>
          <!-- Defer the trailing whitespace text node to preserve indentation -->
          <xsl:when test="position() = last() and self::text() and normalize-space(.) = ''">
          </xsl:when>
          
          <!-- Update the timestamp natively if dcterms:modified already exists -->
          <xsl:when test="self::dcterms:modified">
            <xsl:copy>
              <xsl:apply-templates select="@*"/>
              <xsl:value-of select="$current-timestamp"/>
            </xsl:copy>
          </xsl:when>
          
          <!-- Perform the SOURCE block extraction logic natively inline -->
          <xsl:when test="self::rdfs:comment[contains(., 'SOURCE:') and contains(substring-after(., 'SOURCE:'), ']')]">
            
            <xsl:variable name="before-source" select="substring-before(., 'SOURCE:')"/>
            <xsl:variable name="after-source" select="substring-after(., 'SOURCE:')"/>
            
            <xsl:variable name="clean-text-before">
              <xsl:choose>
                <xsl:when test="substring($before-source, string-length($before-source) - 2) = '&#13;&#10;['">
                  <xsl:value-of select="substring($before-source, 1, string-length($before-source) - 3)"/>
                </xsl:when>
                <xsl:when test="substring($before-source, string-length($before-source) - 1) = '&#10;['">
                  <xsl:value-of select="substring($before-source, 1, string-length($before-source) - 2)"/>
                </xsl:when>
                <xsl:when test="substring($before-source, string-length($before-source) - 1) = ' ['">
                  <xsl:value-of select="substring($before-source, 1, string-length($before-source) - 2)"/>
                </xsl:when>
                <xsl:when test="substring($before-source, string-length($before-source)) = '['">
                  <xsl:value-of select="substring($before-source, 1, string-length($before-source) - 1)"/>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="$before-source"/>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:variable>

            <xsl:variable name="text-after-block" select="substring-after($after-source, ']')"/>
            <xsl:variable name="final-comment-text" select="concat($clean-text-before, $text-after-block)"/>
            
            <!-- Conditional output: Only retain the comment if there is substantive text left after extraction -->
            <xsl:if test="normalize-space($final-comment-text) != ''">
              <xsl:copy>
                <xsl:apply-templates select="@*"/>
                <xsl:call-template name="escape-entities">
                  <xsl:with-param name="text" select="$final-comment-text"/>
                </xsl:call-template>
              </xsl:copy>
              
              <!-- Formatting instruction for the new sibling -->
              <xsl:text>&#10;        </xsl:text>
            </xsl:if>
            
            <xsl:variable name="source-value" select="normalize-space(substring-before($after-source, ']'))"/>
            
            <!-- Inherit the language attribute securely before passing payload to the dual entity preserver -->
            <dcterms:source>
              <xsl:copy-of select="@xml:lang"/>
              <xsl:call-template name="escape-entities">
                <xsl:with-param name="text" select="$source-value"/>
              </xsl:call-template>
            </dcterms:source>
          </xsl:when>
          
          <!-- Copy all other standard children untouched -->
          <xsl:otherwise>
            <xsl:apply-templates select="."/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
      
      <!-- Inject dcterms:modified ONLY if it did not exist to be updated during the loop -->
      <xsl:if test="not(dcterms:modified)">
        <xsl:text>&#10;        </xsl:text>
        <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime"><xsl:value-of select="$current-timestamp"/></dcterms:modified>
      </xsl:if>
      
      <!-- Re-append the trailing whitespace text node -->
      <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>