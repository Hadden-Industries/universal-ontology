import java.io.IOException;
import java.io.InputStream;
import java.net.JarURLConnection;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.eclipse.emf.common.util.Diagnostic;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ExtensibleURIConverterImpl;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.Diagnostician;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.emf.ecore.xmi.XMLResource;
import org.eclipse.uml2.uml.InstanceSpecification;
import org.eclipse.uml2.uml.Model;
import org.eclipse.uml2.uml.resource.XMI212UMLResource;
import org.eclipse.uml2.uml.resources.util.UMLResourcesUtil;

/** Native Eclipse UML2 load, resolution and validation; never a subset validator. */
public class ValidateUmlXmi {
  private static int errors = 0;
  private static int warnings = 0;

  private static void record(Diagnostic diagnostic) {
    if (diagnostic.getChildren().isEmpty()) {
      if (diagnostic.getSeverity() >= Diagnostic.ERROR) errors++;
      else if (diagnostic.getSeverity() == Diagnostic.WARNING) warnings++;
      if (diagnostic.getSeverity() >= Diagnostic.WARNING) System.err.println(diagnostic.getMessage());
    } else for (Diagnostic child : diagnostic.getChildren()) record(child);
  }

  public static void main(String[] arguments) throws Exception {
    if (arguments.length != 1) throw new IllegalArgumentException("Require one XMI file");
    Path input = Path.of(arguments[0]).toRealPath();
    Set<Path> bundles = new HashSet<>();
    for (String entry : System.getProperty("java.class.path").split(java.io.File.pathSeparator)) {
      Path path = Path.of(entry).toRealPath();
      if (path.toString().endsWith(".jar")) bundles.add(path);
    }
    ResourceSet resources = UMLResourcesUtil.init(new ResourceSetImpl());
    ExtensibleURIConverterImpl offline = new ExtensibleURIConverterImpl() {
      @Override public InputStream createInputStream(URI uri, Map<?,?> options) throws IOException {
        URI actual = normalize(uri);
        boolean allowed = actual.isFile() && Path.of(java.net.URI.create(actual.toString())).toRealPath().equals(input);
        if (actual.isArchive() && "jar".equals(actual.scheme())) {
          JarURLConnection archive = (JarURLConnection) java.net.URI.create(actual.toString()).toURL().openConnection();
          if ("file".equals(archive.getJarFileURL().getProtocol()))
            allowed = bundles.contains(Path.of(java.net.URI.create(archive.getJarFileURL().toExternalForm())).toRealPath());
        }
        if (!allowed) throw new IOException("Unregistered native resource resolution is forbidden: " + actual);
        return super.createInputStream(uri,options);
      }
    };
    offline.getURIMap().putAll(resources.getURIConverter().getURIMap());
    resources.setURIConverter(offline);
    Resource resource = XMI212UMLResource.Factory.INSTANCE.createResource(URI.createFileURI(arguments[0]));
    resources.getResources().add(resource);
    resource.load(Map.of(XMLResource.OPTION_PARSER_FEATURES, Map.of(
      "http://apache.org/xml/features/disallow-doctype-decl",true,
      "http://xml.org/sax/features/external-general-entities",false,
      "http://xml.org/sax/features/external-parameter-entities",false,
      "http://apache.org/xml/features/nonvalidating/load-external-dtd",false
    )));
    EcoreUtil.resolveAll(resources);
    errors += resource.getErrors().size();
    warnings += resource.getWarnings().size();
    int models = 0;
    int instances = 0;
    for (EObject root : resource.getContents()) {
      record(Diagnostician.INSTANCE.validate(root));
      if (root instanceof Model) {
        models++;
        for (TreeIterator<EObject> all = root.eAllContents(); all.hasNext();) if (all.next() instanceof InstanceSpecification) instances++;
      }
    }
    int unresolved = EcoreUtil.UnresolvedProxyCrossReferencer.find(resource).size();
    if (unresolved != 0) errors += unresolved;
    System.out.printf("{\"models\":%d,\"instanceSpecifications\":%d,\"errors\":%d,\"warnings\":%d,\"unresolvedReferences\":%d}%n",models,instances,errors,warnings,unresolved);
    if (errors != 0 || models != 1) System.exit(1);
  }
}
