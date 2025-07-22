export const info =
`Introduction:
Python is a high-level, interpreted programming language known for its simplicity and readability. It is widely used in web development, data science, AI, automation, and more.

Advanced pyhton:
Advanced Python Concepts 🚀
Once you're comfortable with the basics, it's time to explore Python's more powerful features.

1️⃣ List Comprehensions (Efficient List Operations)
A concise way to create lists.

python
Copy
Edit
numbers = [x for x in range(1, 6)]  # [1, 2, 3, 4, 5]
squared = [x**2 for x in numbers]   # [1, 4, 9, 16, 25]
evens = [x for x in numbers if x % 2 == 0]  # [2, 4]
Faster and cleaner than using loops!

2️⃣ Lambda Functions (Anonymous Functions)
Small, inline functions for quick operations.

python
Copy
Edit
add = lambda a, b: a + b
print(add(5, 3))  # 8

numbers = [1, 2, 3, 4, 5]
doubled = list(map(lambda x: x * 2, numbers))  # [2, 4, 6, 8, 10]
Useful for map(), filter(), and reduce() operations.

3️⃣ Generators (Memory-Efficient Iteration)
Generate values lazily using yield.

python
Copy
Edit
def count_up_to(n):
    num = 1
    while num <= n:
        yield num
        num += 1

counter = count_up_to(5)
print(next(counter))  # 1
print(next(counter))  # 2
Generators save memory by not storing the entire sequence in RAM.

4️⃣ Decorators (Modifying Functions on the Fly)
Functions that wrap another function to extend behavior.

python
Copy
Edit
def decorator(func):
    def wrapper():
        print("Before function call")
        func()
        print("After function call")
    return wrapper

@decorator
def say_hello():
    print("Hello!")

say_hello()
Decorators are used for logging, authentication, and performance monitoring.

5️⃣ Object-Oriented Programming (OOP in Python)
Encapsulation, Inheritance, and Polymorphism.

python
Copy
Edit
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "Sound"

class Dog(Animal):  # Inheritance
    def speak(self):
        return "Woof!"

dog = Dog("Buddy")
print(dog.speak())  # Woof!
OOP helps in structuring complex programs efficiently.

6️⃣ Multithreading & Multiprocessing
Efficient parallel execution of tasks.

Multithreading (For I/O-bound tasks)
python
Copy
Edit
import threading

def print_numbers():
    for i in range(5):
        print(i)

thread = threading.Thread(target=print_numbers)
thread.start()
Best for network requests, file I/O, and UI applications.

Multiprocessing (For CPU-bound tasks)
python
Copy
Edit
from multiprocessing import Process

def compute():
    print(sum(range(10**6)))

process = Process(target=compute)
process.start()
process.join()
Best for data processing, image processing, and AI computations.

7️⃣ Asynchronous Programming (async/await for Concurrency)
Best for handling many tasks without blocking execution.

python
Copy
Edit
import asyncio

async def fetch_data():
    print("Fetching data...")
    await asyncio.sleep(2)
    print("Data received!")

asyncio.run(fetch_data())
Use cases: Web scraping, API calls, real-time applications.

8️⃣ Regular Expressions (Regex for Pattern Matching)
Powerful for text processing and validation.

python
Copy
Edit
import re

pattern = r"\d{3}-\d{2}-\d{4}"
text = "My SSN is 123-45-6789."

match = re.search(pattern, text)
if match:
    print("Valid format!")
Used in data validation, web scraping, and text analytics.

9️⃣ Working with APIs (Requests Module)
Fetching data from external sources.

python
Copy
Edit
import requests

response = requests.get("https://api.github.com")
print(response.json())  # GitHub API data
APIs allow Python to interact with web services, databases, and more.

🔟 Machine Learning & AI with Python
Python is widely used in AI, Data Science, and Deep Learning with libraries like:

NumPy & Pandas – Data handling & analysis

Matplotlib & Seaborn – Data visualization

Scikit-learn – Machine Learning

TensorFlow & PyTorch – Deep Learning

Example: Simple Machine Learning Model

python
Copy
Edit
from sklearn.linear_model import LinearRegression

X = [[1], [2], [3], [4], [5]]
y = [2, 4, 6, 8, 10]

model = LinearRegression()
model.fit(X, y)

print(model.predict([[6]]))  # Predicts 12
Python makes AI and Data Science accessible and powerful!

💡 Python is limitless! Want to go deeper into Data Science, Web Scraping, or Automation? 🚀`;