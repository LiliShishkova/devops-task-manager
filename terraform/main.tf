provider "aws" {
  region = "eu-central-1"
}

resource "aws_instance" "devops-task-manager" {
  ami           = "ami-123456"
  instance_type = "t2.micro"
}