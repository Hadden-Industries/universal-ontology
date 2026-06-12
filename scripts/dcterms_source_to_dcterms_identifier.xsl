<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                xmlns:dcterms="http://purl.org/dc/terms/"
                xmlns:owl="http://www.w3.org/2002/07/owl#">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" omit-xml-declaration="no" indent="no"/>
  <xsl:preserve-space elements="*"/>

  <!-- Identity Transform -->
  <xsl:template match="@* | node()">
    <xsl:copy>
      <xsl:apply-templates select="@* | node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Targeted transformation via XPath predicate evaluating the rdf:resource attribute and parent context -->
  <xsl:template match="dcterms:source[starts-with(@rdf:resource, 'urn:iso:std:iso-iec:11179:-3:ed-4') and not(parent::owl:NamedIndividual)]">
    <dcterms:identifier>
      <xsl:apply-templates select="@* | node()"/>
    </dcterms:identifier>
  </xsl:template>

</xsl:stylesheet>