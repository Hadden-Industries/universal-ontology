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

    return request;
}