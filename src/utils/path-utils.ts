/**
 * Path utility functions for SVG path manipulation.
 * Per D-03 (REF-05): Unified path utilities extracted from transform-to-pptel.ts and svg-parser.ts.
 */

/**
 * Convert relative path commands to absolute coordinates.
 * Handles: M, L, H, V, A, C, Q, S, T, Z (and their lowercase relative variants)
 * Per D-05 (REF-02): S/s and T/t use reflection from previous control point
 */
export function toAbsolutePath(d: string): string {
  let result = ''
  let curX = 0
  let curY = 0
  // REF-02: Track previous control point for S/s and T/t reflection
  let prevCtrlX = 0
  let prevCtrlY = 0
  let prevCmdU = ''

  const segments = d.split(/(?=[MLHVACSZ])/i)
  for (const seg of segments) {
    const cmdMatch = seg.match(/^([MLHVACSZ])\s*/i)
    if (!cmdMatch) {
      result += seg
      continue
    }
    const cmd = cmdMatch[1]
    const isRel = cmd === cmd.toLowerCase()
    const cmdU = cmd.toUpperCase()
    const nums = seg.slice(cmdMatch[0].length).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))

    if (cmdU === 'Z') {
      result += 'Z'
      curX = 0
      curY = 0
      prevCtrlX = 0
      prevCtrlY = 0
      prevCmdU = 'Z'
      continue
    }

    if (cmdU === 'M') {
      for (let i = 0; i < nums.length; i += 2) {
        const x = isRel ? curX + nums[i] : nums[i]
        const y = i + 1 < nums.length ? (isRel ? curY + nums[i + 1] : nums[i + 1]) : curY
        result += (i === 0 ? `M${x},${y}` : `L${x},${y}`)
        curX = x
        curY = y
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'M'
    } else if (cmdU === 'L') {
      for (let i = 0; i < nums.length; i += 2) {
        const x = isRel ? curX + nums[i] : nums[i]
        const y = i + 1 < nums.length ? (isRel ? curY + nums[i + 1] : nums[i + 1]) : curY
        result += `L${x},${y}`
        curX = x
        curY = y
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'L'
    } else if (cmdU === 'H') {
      for (const nx of nums) {
        const x = isRel ? curX + nx : nx
        result += `H${x}`
        curX = x
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'H'
    } else if (cmdU === 'V') {
      for (const ny of nums) {
        const y = isRel ? curY + ny : ny
        result += `V${y}`
        curY = y
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'V'
    } else if (cmdU === 'A') {
      for (let i = 0; i < nums.length; i += 7) {
        const rx = nums[i]
        const ry = nums[i + 1]
        const xRot = nums[i + 2]
        const largeArc = nums[i + 3]
        const sweep = nums[i + 4]
        const x = isRel ? curX + nums[i + 5] : nums[i + 5]
        const y = isRel ? curY + nums[i + 6] : nums[i + 6]
        result += `A${rx},${ry},${xRot},${largeArc},${sweep},${x},${y}`
        curX = x
        curY = y
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'A'
    } else if (cmdU === 'C') {
      // Cubic bezier: x1,y1 x2,y2 x,y
      for (let i = 0; i < nums.length; i += 6) {
        const x1 = isRel ? curX + nums[i] : nums[i]
        const y1 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x2 = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y2 = isRel ? curY + nums[i + 3] : nums[i + 3]
        const x = isRel ? curX + nums[i + 4] : nums[i + 4]
        const y = isRel ? curY + nums[i + 5] : nums[i + 5]
        result += `C${x1},${y1},${x2},${y2},${x},${y}`
        curX = x
        curY = y
        // Update prev control point to (x2, y2)
        prevCtrlX = x2
        prevCtrlY = y2
      }
      prevCmdU = 'C'
    } else if (cmdU === 'S') {
      // REF-02: Smooth cubic bezier
      // First control point is reflection of previous control point about current point
      // If previous was C or S, use reflection; otherwise use current point
      for (let i = 0; i < nums.length; i += 4) {
        // First control point: reflect prevCtrl about cur
        const x1 = (prevCmdU === 'C' || prevCmdU === 'S')
          ? 2 * curX - prevCtrlX
          : curX
        const y1 = (prevCmdU === 'C' || prevCmdU === 'S')
          ? 2 * curY - prevCtrlY
          : curY
        const x2 = isRel ? curX + nums[i] : nums[i]
        const y2 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y = isRel ? curY + nums[i + 3] : nums[i + 3]
        result += `C${x1},${y1},${x2},${y2},${x},${y}`
        curX = x
        curY = y
        // Update prev control point to (x2, y2)
        prevCtrlX = x2
        prevCtrlY = y2
      }
      prevCmdU = 'S'
    } else if (cmdU === 'Q') {
      // Quadratic bezier: x1,y1 x,y
      for (let i = 0; i < nums.length; i += 4) {
        const x1 = isRel ? curX + nums[i] : nums[i]
        const y1 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y = isRel ? curY + nums[i + 3] : nums[i + 3]
        result += `Q${x1},${y1},${x},${y}`
        curX = x
        curY = y
        // Update prev control point to (x1, y1)
        prevCtrlX = x1
        prevCtrlY = y1
      }
      prevCmdU = 'Q'
    } else if (cmdU === 'T') {
      // REF-02: Smooth quadratic bezier
      // Control point is reflection of previous control point about current point
      // If previous was Q or T, use reflection; otherwise use current point
      const x1 = (prevCmdU === 'Q' || prevCmdU === 'T')
        ? 2 * curX - prevCtrlX
        : curX
      const y1 = (prevCmdU === 'Q' || prevCmdU === 'T')
        ? 2 * curY - prevCtrlY
        : curY
      for (let i = 0; i < nums.length; i += 2) {
        const x = isRel ? curX + nums[i] : nums[i]
        const y = isRel ? curY + nums[i + 1] : nums[i + 1]
        result += `Q${x1},${y1},${x},${y}`
        curX = x
        curY = y
        // Update prev control point to current point
        prevCtrlX = curX
        prevCtrlY = curY
      }
      prevCmdU = 'T'
    }
  }

  return result
}

/**
 * Scale path coordinates by scaleX and scaleY factors.
 * Supports all path commands: M, L, H, V, A, C, Q, S, T, Z (and lowercase)
 * Per D-03 (REF-05): Extended from svg-parser version to support C/Q/S/T/Z.
 */
export function scalePathCoords(d: string, scaleX: number, scaleY: number): string {
  let result = ''
  let curX = 0
  let curY = 0
  let prevCtrlX = 0
  let prevCtrlY = 0
  let prevCmdU = ''

  const segments = d.split(/(?=[MLHVACSZ])/i)
  for (const seg of segments) {
    const cmdMatch = seg.match(/^([MLHVACSZ])\s*/i)
    if (!cmdMatch) {
      result += seg
      continue
    }
    const cmd = cmdMatch[1]
    const isRel = cmd === cmd.toLowerCase()
    const cmdU = cmd.toUpperCase()
    const nums = seg.slice(cmdMatch[0].length).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))

    if (cmdU === 'Z') {
      result += 'Z'
      curX = 0
      curY = 0
      prevCtrlX = 0
      prevCtrlY = 0
      prevCmdU = 'Z'
      continue
    }

    if (cmdU === 'M') {
      for (let i = 0; i < nums.length; i += 2) {
        const absX = isRel ? curX + nums[i] : nums[i]
        const absY = i + 1 < nums.length ? (isRel ? curY + nums[i + 1] : nums[i + 1]) : curY
        result += (i === 0 ? `M${absX * scaleX},${absY * scaleY}` : `L${absX * scaleX},${absY * scaleY}`)
        curX = absX
        curY = absY
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'M'
    } else if (cmdU === 'L') {
      for (let i = 0; i < nums.length; i += 2) {
        const absX = isRel ? curX + nums[i] : nums[i]
        const absY = i + 1 < nums.length ? (isRel ? curY + nums[i + 1] : nums[i + 1]) : curY
        result += `L${absX * scaleX},${absY * scaleY}`
        curX = absX
        curY = absY
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'L'
    } else if (cmdU === 'H') {
      for (const nx of nums) {
        const absX = isRel ? curX + nx : nx
        result += `H${absX * scaleX}`
        curX = absX
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'H'
    } else if (cmdU === 'V') {
      for (const ny of nums) {
        const absY = isRel ? curY + ny : ny
        result += `V${absY * scaleY}`
        curY = absY
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'V'
    } else if (cmdU === 'A') {
      for (let i = 0; i < nums.length; i += 7) {
        const absX = isRel ? curX + nums[i + 5] : nums[i + 5]
        const absY = isRel ? curY + nums[i + 6] : nums[i + 6]
        result += `A${nums[i] * scaleX},${nums[i + 1] * scaleY},${nums[i + 2]},${nums[i + 3]},${nums[i + 4]},${absX * scaleX},${absY * scaleY}`
        curX = absX
        curY = absY
      }
      prevCtrlX = curX
      prevCtrlY = curY
      prevCmdU = 'A'
    } else if (cmdU === 'C') {
      // Cubic bezier: x1,y1 x2,y2 x,y
      for (let i = 0; i < nums.length; i += 6) {
        const x1 = isRel ? curX + nums[i] : nums[i]
        const y1 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x2 = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y2 = isRel ? curY + nums[i + 3] : nums[i + 3]
        const x = isRel ? curX + nums[i + 4] : nums[i + 4]
        const y = isRel ? curY + nums[i + 5] : nums[i + 5]
        result += `C${x1 * scaleX},${y1 * scaleY},${x2 * scaleX},${y2 * scaleY},${x * scaleX},${y * scaleY}`
        curX = x
        curY = y
        prevCtrlX = x2
        prevCtrlY = y2
      }
      prevCmdU = 'C'
    } else if (cmdU === 'S') {
      // Smooth cubic bezier: x2,y2 x,y (first control point reflected)
      for (let i = 0; i < nums.length; i += 4) {
        const x1 = (prevCmdU === 'C' || prevCmdU === 'S')
          ? 2 * curX - prevCtrlX
          : curX
        const y1 = (prevCmdU === 'C' || prevCmdU === 'S')
          ? 2 * curY - prevCtrlY
          : curY
        const x2 = isRel ? curX + nums[i] : nums[i]
        const y2 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y = isRel ? curY + nums[i + 3] : nums[i + 3]
        result += `C${x1 * scaleX},${y1 * scaleY},${x2 * scaleX},${y2 * scaleY},${x * scaleX},${y * scaleY}`
        curX = x
        curY = y
        prevCtrlX = x2
        prevCtrlY = y2
      }
      prevCmdU = 'S'
    } else if (cmdU === 'Q') {
      // Quadratic bezier: x1,y1 x,y
      for (let i = 0; i < nums.length; i += 4) {
        const x1 = isRel ? curX + nums[i] : nums[i]
        const y1 = isRel ? curY + nums[i + 1] : nums[i + 1]
        const x = isRel ? curX + nums[i + 2] : nums[i + 2]
        const y = isRel ? curY + nums[i + 3] : nums[i + 3]
        result += `Q${x1 * scaleX},${y1 * scaleY},${x * scaleX},${y * scaleY}`
        curX = x
        curY = y
        prevCtrlX = x1
        prevCtrlY = y1
      }
      prevCmdU = 'Q'
    } else if (cmdU === 'T') {
      // Smooth quadratic bezier: x,y (control point reflected)
      const x1 = (prevCmdU === 'Q' || prevCmdU === 'T')
        ? 2 * curX - prevCtrlX
        : curX
      const y1 = (prevCmdU === 'Q' || prevCmdU === 'T')
        ? 2 * curY - prevCtrlY
        : curY
      for (let i = 0; i < nums.length; i += 2) {
        const x = isRel ? curX + nums[i] : nums[i]
        const y = isRel ? curY + nums[i + 1] : nums[i + 1]
        result += `Q${x1 * scaleX},${y1 * scaleY},${x * scaleX},${y * scaleY}`
        curX = x
        curY = y
        prevCtrlX = curX
        prevCtrlY = curY
      }
      prevCmdU = 'T'
    }
  }

  return result
}
