import Link from 'next/link'

export default function Home() {
  return (
    <main className='flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center'>
      <h1 className='text-5xl font-bold tracking-tight'>Project name</h1>
      <p className='max-w-md text-lg text-zinc-600'>
        One sentence on the problem we solve. Replace this on Saturday.
      </p>
      <Link href='/dashboard' className='rounded-md bg-black px-6 py-3 text-white'>
        Get started
      </Link>
    </main>
  )
}
