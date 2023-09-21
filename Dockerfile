FROM python:3.9

WORKDIR /app
COPY thoth-server.py ./
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python -u", "thoth-server.py"]
