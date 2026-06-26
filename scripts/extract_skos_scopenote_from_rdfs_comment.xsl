<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
                xmlns:dcterms="http://purl.org/dc/terms/"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:schema="http://schema.org/">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Global parameter for dynamic runtime timestamp injection -->
  <xsl:param name="current-timestamp" select="'2026-06-26T08:53:00Z'"/>

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

  <!-- Targeted transformation: Intercept parent elements possessing an rdfs:comment with Notes -->
  <xsl:template match="*[rdfs:comment[contains(., 'Note ') and contains(., ' to entry:')]]">
    
    <!-- 1. Output the parent element and process its children -->
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      
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
          
          <!-- Evaluate the rdfs:comment to strip notes and generate scopeNotes inline -->
          <xsl:when test="self::rdfs:comment[contains(., 'Note ') and contains(., ' to entry:')]">
            
            <xsl:variable name="cleaned-text">
              <xsl:call-template name="extract-notes">
                <xsl:with-param name="text" select="."/>
                <xsl:with-param name="mode" select="'cleaned-comment'"/>
              </xsl:call-template>
            </xsl:variable>

            <!-- Only retain the original rdfs:comment if it contains substantive text beyond the extracted notes -->
            <xsl:if test="normalize-space($cleaned-text) != ''">
              <xsl:copy>
                <xsl:apply-templates select="@*"/>
                <xsl:call-template name="escape-entities">
                  <xsl:with-param name="text" select="normalize-space($cleaned-text)"/>
                </xsl:call-template>
              </xsl:copy>
              <!-- Add spacing after the retained comment -->
              <xsl:text>&#10;        </xsl:text>
            </xsl:if>

            <!-- Generate the sibling skos:scopeNote elements natively inside the parent -->
            <xsl:call-template name="extract-notes">
              <xsl:with-param name="text" select="."/>
              <xsl:with-param name="mode" select="'scope-notes'"/>
              <xsl:with-param name="lang-node" select="@xml:lang"/>
            </xsl:call-template>
            
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

    <!-- 2. Output the owl:Axiom elements as siblings TO the parent element -->
    <xsl:for-each select="rdfs:comment[contains(., 'Note ') and contains(., ' to entry:')]">
      <xsl:call-template name="extract-notes">
        <xsl:with-param name="text" select="."/>
        <xsl:with-param name="mode" select="'axioms'"/>
        <xsl:with-param name="lang-node" select="@xml:lang"/>
        <xsl:with-param name="source-uri" select="../@rdf:about"/>
      </xsl:call-template>
    </xsl:for-each>
    
  </xsl:template>

  <!-- Core recursive engine to isolate, extract, and format text blocks from the comment -->
  <xsl:template name="extract-notes">
    <xsl:param name="text"/>
    <xsl:param name="mode"/> <!-- Modalities: 'cleaned-comment', 'scope-notes', 'axioms' -->
    <xsl:param name="lang-node"/>
    <xsl:param name="source-uri"/>

    <xsl:choose>
      <xsl:when test="contains($text, 'Note ')">
        <xsl:variable name="before" select="substring-before($text, 'Note ')"/>
        <xsl:variable name="after" select="substring-after($text, 'Note ')"/>
        <xsl:variable name="num" select="substring-before($after, ' to entry:')"/>

        <xsl:choose>
          <!-- Validation Guard: Ensure the text block accurately matches 'Note [Integer] to entry:' -->
          <xsl:when test="contains($after, ' to entry:') and string-length($num) &gt; 0 and translate($num, '0123456789', '') = ''">
            
            <!-- In cleaned-comment mode, preserve only the non-note preceding text -->
            <xsl:if test="$mode = 'cleaned-comment'">
              <xsl:value-of select="$before"/>
            </xsl:if>

            <xsl:variable name="rest-of-text" select="substring-after($after, ' to entry:')"/>

            <!-- Buffer the content of the CURRENT note up until the next valid note starts -->
            <xsl:variable name="note-content">
              <xsl:call-template name="get-note-content">
                <xsl:with-param name="text" select="$rest-of-text"/>
              </xsl:call-template>
            </xsl:variable>

            <!-- Inject skos:scopeNote sibling formatting -->
            <xsl:if test="$mode = 'scope-notes'">
              <skos:scopeNote>
                <xsl:copy-of select="$lang-node"/>
                <xsl:call-template name="escape-entities">
                  <xsl:with-param name="text" select="normalize-space($note-content)"/>
                </xsl:call-template>
              </skos:scopeNote>
              <xsl:text>&#10;        </xsl:text>
            </xsl:if>

            <!-- Inject detached owl:Axiom formatting -->
            <xsl:if test="$mode = 'axioms'">
              <xsl:text>&#10;    </xsl:text>
              <owl:Axiom>
                <xsl:text>&#10;        </xsl:text>
                <owl:annotatedSource rdf:resource="{$source-uri}"/>
                <xsl:text>&#10;        </xsl:text>
                <owl:annotatedProperty rdf:resource="http://www.w3.org/2004/02/skos/core#scopeNote"/>
                <xsl:text>&#10;        </xsl:text>
                <owl:annotatedTarget>
                  <xsl:copy-of select="$lang-node"/>
                  <xsl:call-template name="escape-entities">
                    <xsl:with-param name="text" select="normalize-space($note-content)"/>
                  </xsl:call-template>
                </owl:annotatedTarget>
                <xsl:text>&#10;        </xsl:text>
                <schema:position rdf:datatype="http://www.w3.org/2001/XMLSchema#integer"><xsl:value-of select="$num"/></schema:position>
                <xsl:text>&#10;    </xsl:text>
              </owl:Axiom>
            </xsl:if>

            <!-- Determine the start sequence for the NEXT valid note -->
            <xsl:variable name="next-text">
              <xsl:call-template name="get-rest-after-note">
                <xsl:with-param name="text" select="$rest-of-text"/>
              </xsl:call-template>
            </xsl:variable>

            <!-- Recurse synchronously -->
            <xsl:if test="$next-text != ''">
              <xsl:call-template name="extract-notes">
                <xsl:with-param name="text" select="$next-text"/>
                <xsl:with-param name="mode" select="$mode"/>
                <xsl:with-param name="lang-node" select="$lang-node"/>
                <xsl:with-param name="source-uri" select="$source-uri"/>
              </xsl:call-template>
            </xsl:if>

          </xsl:when>
          
          <xsl:otherwise>
            <!-- False Alarm Bypass: 'Note ' exists contextually but lacks the rigid schema. Keep parsing. -->
            <xsl:if test="$mode = 'cleaned-comment'">
              <xsl:value-of select="$before"/>
              <xsl:text>Note </xsl:text>
            </xsl:if>
            <xsl:call-template name="extract-notes">
              <xsl:with-param name="text" select="$after"/>
              <xsl:with-param name="mode" select="$mode"/>
              <xsl:with-param name="lang-node" select="$lang-node"/>
              <xsl:with-param name="source-uri" select="$source-uri"/>
            </xsl:call-template>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      
      <xsl:otherwise>
        <!-- Termination condition: Reached EOF -->
        <xsl:if test="$mode = 'cleaned-comment'">
          <xsl:value-of select="$text"/>
        </xsl:if>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Helper recursive routine: Extracts the literal string of a note until another valid note boundary is crossed -->
  <xsl:template name="get-note-content">
    <xsl:param name="text"/>
    <xsl:choose>
      <xsl:when test="contains($text, 'Note ')">
        <xsl:variable name="before" select="substring-before($text, 'Note ')"/>
        <xsl:variable name="after" select="substring-after($text, 'Note ')"/>
        <xsl:variable name="num" select="substring-before($after, ' to entry:')"/>
        
        <xsl:choose>
          <xsl:when test="contains($after, ' to entry:') and string-length($num) &gt; 0 and translate($num, '0123456789', '') = ''">
            <xsl:value-of select="$before"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="$before"/>
            <xsl:text>Note </xsl:text>
            <xsl:call-template name="get-note-content">
              <xsl:with-param name="text" select="$after"/>
            </xsl:call-template>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Helper recursive routine: Excludes the literal string of a note to return the boundaries of the remaining text -->
  <xsl:template name="get-rest-after-note">
    <xsl:param name="text"/>
    <xsl:choose>
      <xsl:when test="contains($text, 'Note ')">
        <xsl:variable name="after" select="substring-after($text, 'Note ')"/>
        <xsl:variable name="num" select="substring-before($after, ' to entry:')"/>
        
        <xsl:choose>
          <xsl:when test="contains($after, ' to entry:') and string-length($num) &gt; 0 and translate($num, '0123456789', '') = ''">
            <xsl:text>Note </xsl:text>
            <xsl:value-of select="$after"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:call-template name="get-rest-after-note">
              <xsl:with-param name="text" select="$after"/>
            </xsl:call-template>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <!-- Base case inherently falls through returning an empty string when no notes remain -->
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>