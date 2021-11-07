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


T = TypeVar('T')


def topological_sort(nodes: list[T]) -> list[T]:
    node_state = {node: NodeState.UNTOUCHED for node in nodes}
    result = []

    for node in nodes:
        if node_state[node] == NodeState.UNTOUCHED:
            _dfs(node, node_state, result)

    return list(reversed(result))


def find_roots(nodes: list[T]) -> list[T]:
    return [node for node in nodes if node.parent is None]
