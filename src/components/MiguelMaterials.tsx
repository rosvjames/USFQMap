import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react'
import type { Texture } from 'three'
import type { CampusMaterials } from '../lib/materials'
import { configureMiguelTextures, createMiguelFinishes, MIGUEL_TEXTURE_FILES, type MiguelFinishes } from '../lib/miguelFinishes'

interface MiguelContextValue { finishes: MiguelFinishes; reflection: Texture }
const MiguelContext = createContext<MiguelContextValue | null>(null)

/** The generated textures stay local to Miguel; the panorama is handed on, untouched, to the water that reflects it. */
export function MiguelMaterials({ children }: { children: ReactNode }) {
  const textures = useTexture(MIGUEL_TEXTURE_FILES)
  const gl = useThree(state => state.gl)
  const value = useMemo(() => {
    configureMiguelTextures(textures, Math.min(8, gl.capabilities.getMaxAnisotropy()))
    return { finishes: createMiguelFinishes(textures), reflection: textures.reflections }
  }, [textures, gl])
  // useTexture owns the cached image maps; only these building-specific materials belong to us.
  useEffect(() => () => new Set(Object.values(value.finishes)).forEach(material => material.dispose()), [value])
  return <MiguelContext.Provider value={value}>{children}</MiguelContext.Provider>
}

export function useMiguelMaterials(base: CampusMaterials) {
  const value = useContext(MiguelContext)
  if (!value) throw new Error('Miguel must be rendered inside MiguelMaterials')
  return { ...base, ...value.finishes }
}

/** The panorama the pond water reflects; the same cached texture, never a second copy, and nothing else reads it. */
export function useWaterReflection(): Texture {
  const value = useContext(MiguelContext)
  if (!value) throw new Error('The reflection must be read inside MiguelMaterials')
  return value.reflection
}
