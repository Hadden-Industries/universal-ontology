<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">

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

  <!-- Targeted transformation: Format rdfs:label under Object/Datatype Properties to lowercase natural language -->
  <xsl:template match="owl:ObjectProperty/rdfs:label | owl:DatatypeProperty/rdfs:label">
    <xsl:copy>
      <!-- Replicate existing attributes (e.g., xml:lang) perfectly -->
      <xsl:apply-templates select="@*"/>
      
      <!-- 1. Translate underscores to spaces globally across the label text -->
      <xsl:variable name="no-underscores" select="translate(., '_', ' ')"/>
      
      <!-- 2. Map CamelCase boundary transitions to spaces -->
      <xsl:variable name="spaced-label">
        <xsl:call-template name="split-camel-case">
          <xsl:with-param name="text" select="$no-underscores"/>
        </xsl:call-template>
      </xsl:variable>
      
      <!-- 3. Force the entire evaluated string strictly to lowercase -->
      <xsl:variable name="lowercased-label" select="translate($spaced-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
      
      <!-- 4. Defensively normalize spaces and serialize through the entity preserver -->
      <xsl:call-template name="escape-apos">
        <xsl:with-param name="text" select="normalize-space($lowercased-label)"/>
      </xsl:call-template>
    </xsl:copy>
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