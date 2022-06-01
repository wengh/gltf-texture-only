import { NextApiRequest, NextApiResponse } from 'next'
import { Accessor, Document, ExtensibleProperty, WebIO } from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions'
import Cors from 'cors'

const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS)

export const config = {
    api: {
        responseLimit: false,
    },
}

const cors = Cors({
    methods: ['GET', 'HEAD'],
})

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result)
            }
            return resolve(result)
        })
    })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await runMiddleware(req, res, cors)
        const { url } = req.query
        const glb = await downloadBytes(url as string)
        const inputSize = glb.length
        const document = await io.readBinary(glb)
        minimizeGltf(document)
        const result = await io.writeBinary(document)
        const outputSize = result.length
        console.log(inputSize, outputSize, url)
        res.setHeader('Content-Type', 'model/gltf-binary')
        res.writeHead(200)
        res.end(result.buffer, 'binary')
    } catch (err: any) {
        res.status(500).json({ statusCode: 500, message: err.message })
    }
}

async function downloadBytes(url: string) {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Uint8Array(await blob.arrayBuffer())
}

function minimizeGltf(doc: Document) {
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
        .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]))
        .setType(Accessor.Type.VEC3)
        .setBuffer(buffer)

    const uvAccessor = doc.createAccessor()
        .setArray(new Float32Array([0, 1, 0, 1, 1, 0, 0, 0]))
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
