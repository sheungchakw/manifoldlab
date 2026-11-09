import { MeshStandardMaterial } from 'three'

export const CLASS_IDS: Record<string, number> = {
  planar: 0,
  elliptic: 1,
  parabolic: 2,
  hyperbolic: 3,
}

/**
 * Injects a per-vertex `curvature` attribute → diverging colormap (or
 * 4-class classification map) into a MeshStandardMaterial, keeping scene
 * lighting. Values are normalized to [-1, 1] on the CPU before upload.
 */
export function makeCurvatureMaterial(mode: 'K' | 'H' | 'class'): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.05,
  })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float curvature;\nvarying float vCurv;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvCurv = curvature;',
      )

    const classifySnippet = `
      int c = int(vCurv + 0.5);
      vec3 cmap = c == 1 ? vec3(0.30, 0.75, 0.97)   // elliptic: sky
                : c == 2 ? vec3(0.98, 0.85, 0.30)   // parabolic: yellow
                : c == 3 ? vec3(0.98, 0.45, 0.20)   // hyperbolic: orange
                : vec3(0.55, 0.55, 0.60);           // planar: gray
    `
    const continuousSnippet = `
      float t = clamp(vCurv, -1.0, 1.0);
      vec3 cNeg = vec3(0.23, 0.45, 0.95);
      vec3 cZero = vec3(0.92, 0.93, 0.96);
      vec3 cPos = vec3(0.95, 0.30, 0.25);
      vec3 cmap = t < 0.0 ? mix(cZero, cNeg, -t) : mix(cZero, cPos, t);
    `
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vCurv;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n${mode === 'class' ? classifySnippet : continuousSnippet}\ndiffuseColor.rgb = cmap;`,
      )
  }
  // Distinct programs per mode
  material.customProgramCacheKey = () => `curvature-${mode}`
  return material
}
