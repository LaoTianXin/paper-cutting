import { useEffect } from 'react'
import { ScreenAdaption } from '../script/screenAdaption'

export function useScreenAdaptation(targetX?: number, targetY?: number) {
  useEffect(() => {
    const screenAdaptation = new ScreenAdaption(targetX, targetY)
    screenAdaptation.setScreenAdaptAttrs()
    addEventListener('resize', screenAdaptation.setScreenAdaptAttrs.bind(screenAdaptation))

    return () => {
      screenAdaptation.resetScreenAdaptAttrs()
      removeEventListener('resize', screenAdaptation.setScreenAdaptAttrs.bind(screenAdaptation))
    }
  }, [])
}
