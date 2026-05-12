<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:dcterms="http://purl.org/dc/terms/" 
                xmlns:skos="http://www.w3.org/2004/02/skos/core#"
                exclude-result-prefixes="dcterms">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="dcterms:description">
    <skos:definition>
      <xsl:apply-templates select="@* | node()"/>
    </skos:definition>
  </xsl:template>

</xsl:stylesheet>