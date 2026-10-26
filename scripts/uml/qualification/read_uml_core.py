"""Load the declared ordinary-UML subset using independent native PyEcore."""

import argparse
import json
import os
import sys
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dependencies", type=Path, required=True)
    parser.add_argument("--xmi", type=Path, required=True)
    args = parser.parse_args()
    root = args.dependencies.resolve()
    manifest = json.loads(
        (
            Path(__file__).resolve().parents[3]
            / "docs/uml/qualification-dependencies.v1.json"
        ).read_text(encoding="utf-8")
    )
    sys.path[:0] = [str(root / "wheels" / item["path"]) for item in manifest["python"]]
    # Only qualification-process imports change; the repository .venv stays intact.
    import pyecore.ecore as ecore
    from lxml import etree
    from pyecore.resources import URI, ResourceSet

    model_root = root / "metamodels"
    if model_root.is_symlink():
        raise ValueError("Linked native metamodel cache")
    model_root.mkdir(exist_ok=True)
    for jar in [root / "jars" / item["path"] for item in manifest["java"]]:
        with ZipFile(jar) as archive:
            for name in ("model/UML.ecore", "model/Types.ecore"):
                if name not in archive.namelist():
                    continue
                target = model_root / Path(name).name
                if target.is_symlink():
                    raise ValueError("Linked native metamodel")
                data = archive.read(name)
                if target.exists():
                    if target.read_bytes() != data:
                        raise ValueError("Changed retained native metamodel")
                else:
                    with target.open("xb") as stream:
                        stream.write(data)

    allowed = {
        os.path.normcase(str((model_root / name).resolve())): (
            model_root / name
        ).resolve()
        for name in ("UML.ecore", "Types.ecore")
    }

    class MemoryURI(URI):
        def __init__(self, name, data):
            super().__init__(name)
            self.data = data

        def create_instream(self):
            return BytesIO(self.data)

    class OfflineResources(ResourceSet):
        def get_resource(self, uri, options=None, **kwargs):
            if not isinstance(uri, MemoryURI):
                path = uri.plain if isinstance(uri, URI) else str(uri)
                # Lexical lookup must precede filesystem access: resolving an
                # unregistered Windows UNC path can already contact a server.
                registered = allowed.get(os.path.normcase(os.path.normpath(path)))
                if registered is None:
                    raise ValueError("Unregistered external core-reader resource")
                uri = URI(str(registered))
            return super().get_resource(uri, options=options, **kwargs)

    resources = OfflineResources()
    resources.metamodel_registry[
        "platform:/plugin/org.eclipse.emf.ecore/model/Ecore.ecore"
    ] = ecore
    types_path = model_root / "Types.ecore"
    types = resources.get_resource(URI(str(types_path))).contents[0]

    # UML's declared primitive EDataTypes use Java names; bind their public native
    # conversion hooks to the corresponding Python values, including unlimited '*'.
    def boolean(value):
        if value not in ("true", "false"):
            raise ValueError("Invalid UML Boolean")
        return value == "true"

    for name, primitive in [
        ("Integer", int),
        ("UnlimitedNatural", int),
        ("Real", float),
        ("String", str),
        ("Boolean", bool),
    ]:
        datatype = types.getEClassifier(name)
        datatype.eType = primitive
        datatype.from_string = boolean if primitive is bool else primitive
        if name == "UnlimitedNatural":
            datatype.from_string = lambda value: -1 if value == "*" else int(value)
    resources.metamodel_registry[types.nsURI] = types
    resources.uri_mapper[
        "platform:/plugin/org.eclipse.uml2.types/model/Types.ecore"
    ] = str(types_path)
    uml = resources.get_resource(URI(str(model_root / "UML.ecore"))).contents[0]
    resources.metamodel_registry[uml.nsURI] = uml
    resources.metamodel_registry["http://schema.omg.org/spec/UML/2.1.1"] = uml
    tree = etree.parse(
        str(args.xmi),
        etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False),
    )
    if tree.docinfo.doctype:
        raise ValueError("DOCTYPE is forbidden")
    namespaces = {
        "xmi": "http://schema.omg.org/spec/XMI/2.1",
        "uml": "http://schema.omg.org/spec/UML/2.1.1",
    }
    models = tree.xpath("/xmi:XMI/uml:Model", namespaces=namespaces)
    if len(models) != 1:
        raise ValueError("Expected one UML model")
    model = models[0]
    for extension in model.xpath(
        ".//xmi:Extension|.//profileApplication", namespaces=namespaces
    ):
        extension.getparent().remove(extension)
    # The declared core-reader claim excludes dynamic stereotype applications and
    # their Ecore loading hints. Every authoritative source value remains in Model.
    core = etree.Element("{" + namespaces["xmi"] + "}XMI", nsmap=tree.getroot().nsmap)
    core.set("{" + namespaces["xmi"] + "}version", "2.1")
    core.append(model)
    data = etree.tostring(core, encoding="utf-8")
    loaded = resources.get_resource(MemoryURI(str(args.xmi) + ".core.xmi", data))
    if len(loaded.contents) != 1 or loaded.contents[0].eClass.name != "Model":
        raise ValueError("Native core reader did not load the model")
    instances = sum(
        1
        for item in loaded.contents[0].eAllContents()
        if item.eClass.name == "InstanceSpecification"
    )
    print(
        json.dumps(
            {
                "models": 1,
                "instanceSpecifications": instances,
                "metamodelClasses": len(uml.eClassifiers),
            }
        )
    )


if __name__ == "__main__":
    main()
