import { createFileRoute } from '@tanstack/react-router'
import {
  testResultRaw,
  testResultErrRaw,
  testResultSerialized,
  testResultErrSerialized,
} from '@web/server/entrypoints/functions/test.fn'

export const Route = createFileRoute('/_public/test')({
  component: TestPage,
})

function TestPage() {
  const handleTest = async () => {
    console.log('--- testResultRaw (Ok) ---')
    const raw = await testResultRaw()
    console.log(raw)

    console.log('--- testResultErrRaw ---')
    const errRaw = await testResultErrRaw()
    console.log(errRaw)

    console.log('--- testResultSerialized (Ok) ---')
    const serialized = await testResultSerialized()
    console.log(serialized)

    console.log('--- testResultErrSerialized ---')
    const errSerialized = await testResultErrSerialized()
    console.log(errSerialized)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Result Transport Test</h1>
      <button
        type="button"
        onClick={handleTest}
        style={{
          padding: '0.5rem 1rem',
          background: 'white',
          color: 'black',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Run Tests (check console)
      </button>
    </div>
  )
}
