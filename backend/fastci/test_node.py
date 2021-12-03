from dataclasses import dataclass
from typing import Optional

from .node import topological_sort


@dataclass
class NamedNode:
    name: str
    parent: Optional['NamedNode']
    children: list['NamedNode']

    def __repr__(self) -> str:
        return self.name

    def __hash__(self) -> int:
        return id(self)


def test_topsort():
    root = NamedNode('root', None, [])

    a = NamedNode('a', root, [])
    root.children.append(a)

    b = NamedNode('b', root, [])
    root.children.append(b)

    c = NamedNode('c', a, [])
    a.children.append(c)

    d = NamedNode('d', c, [])
    c.children.append(d)

    e = NamedNode('e', None, [])

    nodes = [e, a, b, c, d, root]

    sorted_nodes = topological_sort(nodes)

    assert sorted_nodes == [{root, e}, {a, b}, {c}, {d}]

