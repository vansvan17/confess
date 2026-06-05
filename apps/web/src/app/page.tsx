import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold mb-4">Confess</h1>
      <p className="text-gray-600 mb-8 max-w-lg mx-auto">
        A knowledge base that knows what it doesn&apos;t know. Upload documents, ask questions, and
        get answers with confidence scores.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/upload"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Upload Documents
        </Link>
        <Link href="/query" className="bg-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300">
          Ask a Question
        </Link>
      </div>
    </div>
  );
}
