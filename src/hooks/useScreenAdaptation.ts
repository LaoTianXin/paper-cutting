import { useEffect } from 'react'
import { ScreenAdaption } from '../script/screenAdaption'

export function useScreenAdaptation(targetX?: number, targetY?: number) {
  useEffect(() => {
    const screenAdaptation = new ScreenAdaption(targetX, targetY)
    // 保存绑定函数的引用，确保 removeEventListener 能正确移除
    const handleResize = screenAdaptation.setScreenAdaptAttrs.bind(screenAdaptation)
    
    screenAdaptation.setScreenAdaptAttrs()
    window.addEventListener('resize', handleResize)

    return () => {
      screenAdaptation.resetScreenAdaptAttrs()
      window.removeEventListener('resize', handleResize)
    }
  }, [targetX, targetY])
}
