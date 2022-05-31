import { NextApiRequest, NextApiResponse } from 'next'
import { Accessor, Document, ExtensibleProperty, WebIO } from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions'

const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { url } = req.query
        const result = await run(url as string)
        console.log(result.length)
        console.log(url)
        res.setHeader('Content-Type', 'model/gltf-binary')
        res.writeHead(200)
        res.end(result.buffer, 'binary')
    } catch (err: any) {
        res.status(500).json({ statusCode: 500, message: err.message })
    }
}

async function run(url: string) {
    const document = await downloadGltf(url)
    processGltf(document)
    return await io.writeBinary(document)
}

async function downloadGltf(url: string) {
    const response = await fetch(url)
    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    const array = new Uint8Array(buffer)
    console.log(array.length)
    return await io.readBinary(array)
}

function processGltf(doc: Document) {
    clear(doc.getRoot().listSkins())
    clear(doc.getRoot().listAnimations())
    clear(doc.getRoot().listMeshes())
    clear(doc.getRoot().listNodes())
    clear(doc.getRoot().listScenes())
    clear(doc.getRoot().listBuffers())
    clear(doc.getRoot().listAccessors())

    const buffer = doc.createBuffer()

    const indexAccessor = doc.createAccessor()
        .setArray(new Uint16Array([0, 1, 2, 1, 3, 2]))
        .setType(Accessor.Type.SCALAR)
        .setBuffer(buffer)

    const positionAccessor = doc.createAccessor()
        .setArray(new Float32Array([0,0,0, 1,0,0, 0,1,0, 1,1,0]))
        .setType(Accessor.Type.VEC3)
        .setBuffer(buffer)

    const uvAccessor = doc.createAccessor()
        .setArray(new Float32Array([0,1, 0,1, 1,0, 0,0]))
        .setType(Accessor.Type.VEC2)
        .setBuffer(buffer)

    const materials = doc.getRoot().listMaterials()

    const mesh = doc.createMesh()
    for (const material of materials) {
        const primitive = doc.createPrimitive()
            .setAttribute('POSITION', positionAccessor)
            .setAttribute('TEXCOORD_0', uvAccessor)
            .setIndices(indexAccessor)
            .setMaterial(material)
        mesh.addPrimitive(primitive)
    }

    const node = doc.createNode()
        .setMesh(mesh)

    doc.createScene()
        .addChild(node)

    function clear(properties: ExtensibleProperty[]) {
        for (const property of properties) {
            property.dispose()
        }
    }
}

function minimizeGltf(gltf: any) {
    delete gltf?.skins
    delete gltf?.animations
    const textures = gltf.textures
    const count = textures.length
    const indices = []
    for (let i = 0; i < count; i++) {
        indices.push(i)
    }
    gltf.materials = indices.map(i => ({
        pbrMetallicRoughness: {
            baseColorTexture: {
                index: i,
            },
        },
    }))
    gltf.meshes = [
        {
            primitives: indices.map(i => ({
                attributes: {
                    POSITION: 1,
                    TEXCOORD_0: 2,
                },
                indices: 0,
                material: i,
            })),
        },
    ]

    gltf.nodes = [{ mesh: 0 }]
    gltf.scenes = [{ nodes: [0] }]
    gltf.buffers = [
        {
            uri: 'data:application/gltf-buffer;base64,AAABAAIAAQADAAIAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAA',
            byteLength: 108,
        },
    ]
    gltf.bufferViews = [
        {
            buffer: 0,
            byteOffset: 0,
            byteLength: 12,
            target: 34963,
        },
        {
            buffer: 0,
            byteOffset: 12,
            byteLength: 96,
            byteStride: 12,
            target: 34962,
        },
    ]
    gltf.accessors = [
        {
            bufferView: 0,
            byteOffset: 0,
            componentType: 5123,
            count: 6,
            type: 'SCALAR',
            max: [3],
            min: [0],
        },
        {
            bufferView: 1,
            byteOffset: 0,
            componentType: 5126,
            count: 4,
            type: 'VEC3',
            max: [1.0, 1.0, 0.0],
            min: [0.0, 0.0, 0.0],
        },
        {
            bufferView: 1,
            byteOffset: 48,
            componentType: 5126,
            count: 4,
            type: 'VEC2',
            max: [1.0, 1.0],
            min: [0.0, 0.0],
        },
    ]
}
