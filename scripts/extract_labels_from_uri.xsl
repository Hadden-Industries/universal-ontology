<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:owl="http://www.w3.org/2002/07/owl#"
                xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Identity Transform -->
  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Match owl:NamedIndividual and owl:Class to append generated labels -->
  <xsl:template match="owl:NamedIndividual | owl:Class">
    <xsl:copy>
      <!-- Replicate existing attributes and child nodes unmodified, EXCLUDING the trailing whitespace text node -->
      <xsl:apply-templates select="@* | node()[not(position() = last() and self::text() and normalize-space(.) = '')]"/>
      
      <!-- Guard clause: Ensure target attribute exists prior to processing -->
      <xsl:if test="@rdf:about">
        <xsl:variable name="identifier">
          <xsl:call-template name="extract-last-path-segment">
            <xsl:with-param name="uri" select="@rdf:about"/>
          </xsl:call-template>
        </xsl:variable>
        
        <!-- Guard clause: Ensure isolated segment is non-empty -->
        <xsl:if test="$identifier != ''">
          <!-- Conditional evaluation: Generate rdfs:label if one is not already present -->
          <xsl:if test="not(rdfs:label)">
            
            <xsl:variable name="spaced-identifier">
              <xsl:call-template name="split-camel-case">
                <xsl:with-param name="text" select="$identifier"/>
              </xsl:call-template>
            </xsl:variable>
            
            <xsl:text>&#10;&#9;</xsl:text>
            <rdfs:label xml:lang="en"><xsl:value-of select="$spaced-identifier"/></rdfs:label>
          </xsl:if>
        </xsl:if>
      </xsl:if>
      
      <!-- Re-append the trailing whitespace text node to preserve closing tag formatting -->
      <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
    </xsl:copy>
  </xsl:template>

  <!-- Deterministic recursion to extract substring following the final delimiter -->
  <xsl:template name="extract-last-path-segment">
    <xsl:param name="uri"/>
    <xsl:choose>
      <xsl:when test="contains($uri, '/')">
        <xsl:call-template name="extract-last-path-segment">
          <xsl:with-param name="uri" select="substring-after($uri, '/')"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$uri"/>
      </xsl:otherwise>
    </xsl:choose>
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
        
        <!-- Recurse for the remainder of the string -->
        <xsl:call-template name="split-camel-case">
          <xsl:with-param name="text" select="$rest-of-text"/>
        </xsl:call-template>
      </xsl:if>
    </xsl:if>
  </xsl:template>

</xsl:stylesheet>