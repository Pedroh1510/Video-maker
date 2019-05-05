from robots.state import saveContent

def user():
    def askAndReturnSearchTerm():
        return str(input('Type a Wikipedia search term: ')).title()
    
    def redLine(lista, text):
        for i in range(len(lista)):
            print('[',i,']',lista[i])
        return int(input(text))
    
    def askAndReturnPrefix():
        prefixes = ['Who is','What is','The history of']
        prefix = redLine(prefixes,'Choose a option: ')
        return prefixes[prefix]
    
    def askAndReturnTemplate():
        prefixes = ['Know the world ','Senta que la vem historia - newsroom','Senta que la vem historia - music epic',
                    'Senta que la vem historia - music evolution']
        prefix = redLine(prefixes,'Choose a option: ')
        return prefix+1
    
    content={
      'searchTerm': askAndReturnSearchTerm(),
      'prefix': askAndReturnPrefix(),
      'maximumSentences': 7,
      'template': askAndReturnTemplate()
      }
    saveContent(content)