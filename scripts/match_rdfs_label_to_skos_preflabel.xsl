<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#"
                xmlns:dcterms="http://purl.org/dc/terms/">

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

  <!-- Targeted transformation: Intercept parent elements possessing a skos:prefLabel -->
  <xsl:template match="*[skos:prefLabel]">
    
    <!-- Evaluate if an actual update is required to prevent superfluous timestamp modification -->
    <xsl:variable name="needs-update">
      <xsl:for-each select="skos:prefLabel">
        <xsl:variable name="lang" select="@xml:lang"/>
        <xsl:variable name="val" select="."/>
        <!-- Flag if an rdfs:label needs to be generated -->
        <xsl:if test="not(../rdfs:label[@xml:lang = $lang])">true</xsl:if>
        <!-- Flag if an existing rdfs:label needs to be synchronised -->
        <xsl:if test="../rdfs:label[@xml:lang = $lang] and not(../rdfs:label[@xml:lang = $lang][. = $val])">true</xsl:if>
      </xsl:for-each>
    </xsl:variable>

    <xsl:choose>
      <!-- Execute logic ONLY if a label modification flag was raised -->
      <xsl:when test="normalize-space($needs-update) != ''">
        <xsl:copy>
          <xsl:apply-templates select="@*"/>
          
          <!-- Iterate over children inline to mutate labels and merge modification timestamps securely -->
          <xsl:for-each select="node()">
            <xsl:choose>
              <!-- Defer the trailing whitespace text node to preserve indentation -->
              <xsl:when test="position() = last() and self::text() and normalize-space(.) = ''">
                <!-- Defer -->
              </xsl:when>
              
              <!-- Update the timestamp natively if dcterms:modified already exists -->
              <xsl:when test="self::dcterms:modified">
                <xsl:copy>
                  <xsl:apply-templates select="@*"/>
                  <xsl:text>2026-06-25T13:11:00Z</xsl:text>
                </xsl:copy>
              </xsl:when>
              
              <!-- Rule 1: Generate missing rdfs:label based on skos:prefLabel -->
              <xsl:when test="self::skos:prefLabel">
                <xsl:copy>
                  <xsl:apply-templates select="@* | node()"/>
                </xsl:copy>
                
                <xsl:variable name="current-lang" select="@xml:lang"/>
                <xsl:if test="not(../rdfs:label[@xml:lang = $current-lang])">
                  <xsl:text>&#10;&#9;</xsl:text>
                  <rdfs:label>
                    <xsl:copy-of select="@xml:lang"/>
                    <xsl:call-template name="escape-entities">
                      <xsl:with-param name="text" select="."/>
                    </xsl:call-template>
                  </rdfs:label>
                </xsl:if>
              </xsl:when>
              
              <!-- Rule 2: Sync existing rdfs:label value with sibling skos:prefLabel -->
              <xsl:when test="self::rdfs:label">
                <xsl:copy>
                  <xsl:apply-templates select="@*"/>
                  <xsl:variable name="current-lang" select="@xml:lang"/>
                  <xsl:variable name="matched-pref" select="../skos:prefLabel[@xml:lang = $current-lang]"/>
                  
                  <xsl:choose>
                    <xsl:when test="$matched-pref and not(../rdfs:label[@xml:lang = $current-lang][. = $matched-pref]) and generate-id(.) = generate-id(../rdfs:label[@xml:lang = $current-lang][last()])">
                      <xsl:call-template name="escape-entities">
                        <xsl:with-param name="text" select="$matched-pref"/>
                      </xsl:call-template>
                    </xsl:when>
                    <xsl:otherwise>
                      <xsl:apply-templates select="node()"/>
                    </xsl:otherwise>
                  </xsl:choose>
                </xsl:copy>
              </xsl:when>
              
              <!-- Copy all other standard children untouched -->
              <xsl:otherwise>
                <xsl:apply-templates select="."/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
          
          <!-- Inject dcterms:modified ONLY if it did not exist to be updated during the loop -->
          <xsl:if test="not(dcterms:modified)">
            <xsl:text>&#10;&#9;</xsl:text>
            <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime">2026-06-25T13:11:00Z</dcterms:modified>
          </xsl:if>
          
          <!-- Re-append the trailing whitespace text node -->
          <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
        </xsl:copy>
      </xsl:when>
      
      <!-- Identity pass-through for elements that do not require any label synchronisation -->
      <xsl:otherwise>
        <xsl:copy>
          <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>