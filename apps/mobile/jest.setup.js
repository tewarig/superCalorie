// React 19 only enables `act` semantics when this is set. Without it,
// Testing Library's renders and its automatic teardown fall out of step, and
// a render following an earlier one in the same file yields an empty tree.
global.IS_REACT_ACT_ENVIRONMENT = true;
