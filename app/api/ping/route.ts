export async function GET() {
  return Response.json({ message: 'pong' })
}

export async function POST() {
  return Response.json({ message: 'pong', method: 'POST' })
}