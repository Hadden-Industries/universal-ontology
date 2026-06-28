function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Check if the requested URI ends with /vocabulary.html
    if (uri.endsWith('/vocabulary.html')) {
        // Rewrite the request to fetch the single master file from S3
        request.uri = '/ontology/vocabulary.html';
    }
    
    // Check if the requested URI ends with /vocabulary.csv
    if (uri.endsWith('/vocabulary.csv')) {
        // Rewrite the request to fetch the single master file from S3
        request.uri = '/ontology/vocabulary.csv';
    }

    // Check if the requested URI ends with /ontology_styles.css
    if (uri.endsWith('/ontology_styles.css')) {
        // Rewrite the request to fetch the single master file from S3
        request.uri = '/ontology/ontology_styles.css';
    }

    // Check if the requested URI ends with /ontology_processor.js
    if (uri.endsWith('/ontology_processor.js')) {
        // Rewrite the request to fetch the single master file from S3
        request.uri = '/ontology/ontology_processor.js';
    }

    return request;
}