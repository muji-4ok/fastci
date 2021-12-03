import enum
from typing import Optional, Protocol, TypeVar


class Node(Protocol):
    parent: Optional['Node']
    children: list['Node']


class NodeState(enum.IntEnum):
    UNTOUCHED = 0
    INSIDE = 1
    EXITED = 2


def _dfs(node: Node, node_state: dict[Node, NodeState], result: list[Node]):
    node_state[node] = NodeState.INSIDE

    for child in node.children:
        if node_state[child] == NodeState.INSIDE:
            # TODO: maybe print out the cycle?
            raise ValueError('Cycle detected!')
        elif node_state[child] == NodeState.UNTOUCHED:
            _dfs(child, node_state, result)

    node_state[node] = NodeState.EXITED
    result.append(node)


T = TypeVar('T', bound=Node)


def topological_sort(nodes: list[T]) -> list[set[T]]:
    node_state = {node: NodeState.UNTOUCHED for node in nodes}
    result = []

    for node in nodes:
        if node_state[node] == NodeState.UNTOUCHED:
            _dfs(node, node_state, result)

    ordered = list(reversed(result))
    node_depth = {node: 0 for node in nodes}
    grouped_result = []

    for node in ordered:
        if node.parent is not None:
            node_depth[node] = node_depth[node.parent] + 1

        if len(grouped_result) == node_depth[node]:
            grouped_result.append({node})
        else:
            grouped_result[node_depth[node]].add(node)

    return grouped_result


def find_roots(nodes: list[T]) -> list[T]:
    return [node for node in nodes if node.parent is None]
