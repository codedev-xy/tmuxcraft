# Lessons

用户纠正之后在这里记录：出了什么问题 → 以后遵守的规则。

（暂无用户纠正）

## 实现过程中的发现

- 修完一批 lint 错误后要重新跑一遍 lint：`react-hooks/set-state-in-effect` 这类错误会被同一处的其他错误遮住，第一轮看不到。
- React 状态要跟随外部对象（引擎）时，用订阅回调里 `setState`，不要在 effect 主体里同步 `setState`。
