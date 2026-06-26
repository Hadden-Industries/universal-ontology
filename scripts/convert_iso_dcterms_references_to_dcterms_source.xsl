<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:dcterms="http://purl.org/dc/terms/">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <xsl:param name="current-timestamp" select="'2026-06-26T22:28:00Z'"/>

  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="text()">
    <xsl:call-template name="escape-entities">
      <xsl:with-param name="text" select="."/>
    </xsl:call-template>
  </xsl:template>

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

  <xsl:template match="*[dcterms:references[starts-with(@rdf:resource, 'urn:iso:std')]]">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      
      <xsl:for-each select="node()">
        <xsl:choose>
          <xsl:when test="position() = last() and self::text() and normalize-space(.) = ''">
          </xsl:when>
          
          <xsl:when test="self::dcterms:modified">
            <xsl:copy>
              <xsl:apply-templates select="@*"/>
              <xsl:value-of select="$current-timestamp"/>
            </xsl:copy>
          </xsl:when>
          
          <xsl:when test="self::dcterms:references[starts-with(@rdf:resource, 'urn:iso:std')]">
            <dcterms:source>
              <xsl:for-each select="@*">
                <xsl:choose>
                  <xsl:when test="name() = 'rdf:resource'">
                    <xsl:attribute name="rdf:resource">
                      <xsl:choose>
                        <xsl:when test="contains(., ':en')">
                          <xsl:value-of select="concat(substring-before(., ':en'), substring-after(., ':en'))"/>
                        </xsl:when>
                        <xsl:otherwise>
                          <xsl:value-of select="."/>
                        </xsl:otherwise>
                      </xsl:choose>
                    </xsl:attribute>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:copy/>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:for-each>
              
              <xsl:apply-templates select="node()"/>
            </dcterms:source>
          </xsl:when>
          
          <xsl:otherwise>
            <xsl:apply-templates select="."/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
      
      <xsl:if test="not(dcterms:modified)">
        <xsl:text>&#10;        </xsl:text>
        <dcterms:modified rdf:datatype="http://www.w3.org/2001/XMLSchema#dateTime"><xsl:value-of select="$current-timestamp"/></dcterms:modified>
      </xsl:if>
      
      <xsl:apply-templates select="node()[position() = last() and self::text() and normalize-space(.) = '']"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>