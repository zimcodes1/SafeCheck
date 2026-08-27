from typing import List, Any

def get_name_with_age(name:str, age:Any):
    fullname = name.title(), age
    return fullname

print (get_name_with_age ("Obadiah", 19))

# Define a list of strings

def process_list (list:List[str]):
    """Process a list of strings"""
    capitalised = []
    for item in list:
        capitalised.append(item.title())
    return capitalised

print(process_list(["helLo", "what", "aZimeh"]))