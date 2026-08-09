# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class StorageTest(gl.Contract):
    test_storage: TreeMap[str, u256]

    @gl.public.write
    def set_val(self, key: str, val: int) -> bool:
        self.test_storage[key] = u256(val)
        return True

    @gl.public.view
    def get_val(self, key: str) -> int:
        return int(self.test_storage.get(key, u256(0)))
