import Link from 'next/link'

const downloadUrl = 'https://www.dropbox.com/s/3boayg55nt3iczc/oven-compressed.glb'
const directUrl = 'https://dl.dropboxusercontent.com/s/3boayg55nt3iczc/oven-compressed.glb'
const filename = 'oven-compressed.glb'

const IndexPage = () => (
  <div>
      <h1>Hello Next.js 👋</h1>
      <p>
          <Link href={`/api/minimize?url=${directUrl}`}>Test</Link> with <a href={downloadUrl}>{filename}</a>
      </p>
  </div>
)

export default IndexPage
