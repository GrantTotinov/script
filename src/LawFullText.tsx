import React, { useEffect, useState } from 'react'

interface LawFull {
  title: string
  date: string
  link: string
  text: string
  meta?: string[]
}

interface Props {
  lawLink: string
  onClose: () => void
}

const LawFullText: React.FC<Props> = ({ lawLink, onClose }) => {
  const [law, setLaw] = useState<LawFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/all_laws_full.json')
      .then((res) => {
        if (!res.ok) throw new Error('Грешка при зареждане на данните')
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const found = data.find((l: LawFull) => l.link === lawLink)
          setLaw(found || null)
        } else setError('Невалиден формат на файла all_laws_full.json')
        setLoading(false)
      })
      .catch(() => {
        setError('Грешка при зареждане на all_laws_full.json')
        setLoading(false)
      })
  }, [lawLink])

  if (loading) return <div>Зареждане...</div>
  if (error) return <div style={{ color: 'orange' }}>Внимание: {error}</div>
  if (!law) return <div>Законът не е намерен.</div>

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
        background: '#fff',
        padding: 24,
        borderRadius: 8,
      }}
    >
      <h2>{law.title}</h2>
      {law.meta && law.meta.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {law.meta.map((m, i) => (
            <div key={i} style={{ color: '#555', fontSize: 14 }}>
              {m}
            </div>
          ))}
        </div>
      )}
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          fontSize: 16,
          background: '#f8f8f8',
          padding: 16,
          borderRadius: 4,
          overflowX: 'auto',
        }}
      >
        {law.text}
      </pre>
      <div style={{ marginTop: 16 }}>
        <a href={law.link} target="_blank" rel="noopener noreferrer">
          Виж в parliament.bg
        </a>
      </div>
      <button onClick={onClose} style={{ marginTop: 16 }}>
        Затвори
      </button>
    </div>
  )
}

export default LawFullText
